export class ShipmentEngine {
  constructor(routingEngine, mapRenderer) {
    this.routingEngine = routingEngine; // For dynamic rerouting
    this.mapRenderer = mapRenderer;
    
    this.shipments = new Map();
    this.shipmentIdCounter = 0;
    
    // Time scaling variables
    // User requested 1 real day = 30 real seconds.
    // So 1 day = 30000 milliseconds.
    this.msPerDay = 30000;
  }

  // Set time scale multiplier (e.g. 10x speeds up the simulation so 1 day = 3 seconds)
  setSpeedMultiplier(mult) {
    this.msPerDay = 30000 / mult;
  }

  spawnShipment(sourceId, destId) {
    const routingResult = this.routingEngine._dijkstra(sourceId, destId, { w_time: 1, w_cost: 0.1, w_risk: 2.0 });
    
    if (!routingResult || !routingResult.edges || routingResult.edges.length === 0) {
      console.error(`Cannot spawn shipment from ${sourceId} to ${destId}: No viable path.`);
      return null;
    }

    const id = `ship-${++this.shipmentIdCounter}`;
    const ship = {
      id,
      origin: sourceId,
      destination: destId,
      originalDestination: destId, // BUG 4 FIX: Never mutate this so recovery always targets the real port
      status: 'moving',
      pathNodes: routingResult.path,
      pathEdges: routingResult.edges,
      
      currentEdgeIndex: 0,
      currentEdge: routingResult.edges[0],
      progress: 0.0,
      currentLatLng: null,
      
      currentHealthDegradation: 100,
      lastRerouteTime: 0,
      _isEvadingVisually: false
    };

    // Calculate initial position
    this._updateShipmentPosition(ship);
    
    this.shipments.set(id, ship);
    return ship;
  }

  update(dt) {
    const daysPassed = dt / this.msPerDay;

    this.shipments.forEach(ship => {
      if (ship.status !== 'moving') return;

      const edge = ship.currentEdge;
      
      // FREEZE FIX: Guard against edges missing geometry (bidirectional sibling not yet rendered)
      // Geometry is now proactively copied in renderEdges, but keep this as a safety net.
      if (!edge || !edge.geometry || edge.geometry.length === 0) {
        // Don't silently freeze — trigger a safe reroute attempt after a short delay
        if (Date.now() - ship.lastRerouteTime > 3000) {
          console.warn(`[FREEZE GUARD] Shipment ${ship.id} has null geometry on edge ${edge?.source}-${edge?.destination}. Triggering safe reroute.`);
          ship.status = 'rerouting';
          this._handleReroute(ship);
        }
        return;
      }

      // Disruption Detection Check:
      // If the upcoming edge has been completely blocked by EventEngine (cost > 900)
      if ((edge.dynamic_time ?? edge.base_time) >= 900) {
         console.warn(`Shipment ${ship.id} violently halted by blockade on edge ${edge.source}-${edge.destination}`);
         if (Date.now() - ship.lastRerouteTime > 3000) {
            ship.status = 'rerouting';
            this._handleReroute(ship);
         } else {
            ship.status = 'waiting'; // Stutter protection
         }
         return;
      }

      const currentDurationDays = edge.dynamic_time;
      let progressDelta = daysPassed / currentDurationDays;
      
      // Evasion time penalty: ship is travelling a longer arc around the anomaly.
      // 0.4x multiplier = ship takes 2.5x longer to complete the edge while evading.
      // This correctly models the extra nautical distance of the detour arc.
      if (ship._isEvadingVisually) {
         progressDelta *= 0.4; 
      }
      
      ship.progress += progressDelta;

      if (ship.progress >= 1.0) {
        // Logically reached end of current edge
        ship.currentEdgeIndex++;
        
        if (ship.currentEdgeIndex >= ship.pathEdges.length) {
          ship.status = 'completed';
          ship.progress = 1.0;
        } else {
          ship.currentEdge = ship.pathEdges[ship.currentEdgeIndex];
          
          // Carry over excess progress so we don't drop time frames
          const excessDays = (ship.progress - 1.0) * currentDurationDays;
          ship.progress = excessDays / ship.currentEdge.dynamic_time;
        }
      }

      this._updateShipmentPosition(ship);
      this._applyGeometricEvasion(ship);
    });
    
    // Transmit to visualization layer — filter completed ships before telemetry
    this.mapRenderer.renderShipments(Array.from(this.shipments.values()));
    if (this.telemetryPanel) {
       // BUG 7 FIX: Don't pass completed ships to telemetry panel
       const activeShips = Array.from(this.shipments.values()).filter(s => s.status !== 'completed');
       this.telemetryPanel.update(activeShips);
    }
  }

  _applyGeometricEvasion(ship) {
      if (!ship.currentLatLng || !window.simulation || !window.simulation.events) return;
      
      const activeEvents = window.simulation.events.activeEvents;
      let isEvading = false;

      for (const event of activeEvents.values()) {
         if (!event.position || !event.radius || event.ruleKey !== 'GEOGRAPHIC_DISRUPTION') continue;

         // BUG 6 FIX: Skip geometric evasion entirely for mild storms — ship just takes the delay
         if (event.severity === 'mild') continue;

         // BUG 8 FIX: Convert radius meters → approximate degrees for correct bounds bypass
         const radiusDeg = (event.radius / 1000) / 111; // 1 deg ≈ 111km
         if (Math.abs(ship.currentLatLng[0] - event.position.lat) > radiusDeg * 2.6 || 
             Math.abs(ship.currentLatLng[1] - event.position.lng) > radiusDeg * 2.6) continue;

         // Replicate Haversine purely mathematically for 60-FPS loop
         const R = 6371e3;
         const phi1 = event.position.lat * Math.PI/180;
         const phi2 = ship.currentLatLng[0] * Math.PI/180;
         const dPhi = (ship.currentLatLng[0] - event.position.lat) * Math.PI/180;
         const dLambda = (ship.currentLatLng[1] - event.position.lng) * Math.PI/180;

         const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda/2) * Math.sin(dLambda/2);
         const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

         // ANTICIPATORY PARABOLIC DEFLECTION ALGORITHM
         const influenceZone = event.radius * 2.5; // Start anticipating the storm at 2.5x radius boundary!
         const targetDist = event.radius * 1.05;   // Force 5% outer bulge curve tightly hugging radius 

         if (dist < influenceZone) {
            isEvading = true;
            
            // Calculate interpolation: 0 at outer boundary -> 1 at perfect dead-center
            const intensity = 1.0 - (dist / influenceZone);
            
            // Square it for a smooth C1 parabolic easing curve natively forcing the output >= targetDist unconditionally! 
            const pushDist = targetDist * (intensity * intensity); 
            const projectedTargetDist = dist + pushDist;
            
            const dLat = ship.currentLatLng[0] - event.position.lat;
            let dLng = ship.currentLatLng[1] - event.position.lng;
            
            if (dLng > 180) dLng -= 360;
            if (dLng < -180) dLng += 360;
            if (dLat === 0 && dLng === 0) dLng = 0.001; 
            
            const scalar = projectedTargetDist / dist;
            
            const deflectedLat = event.position.lat + (dLat * scalar);
            const deflectedLng = event.position.lng + (dLng * scalar);
            
            ship.currentLatLng = [deflectedLat, deflectedLng];
         }
      }
      
      if (ship.status === 'moving') {
         ship._isEvadingVisually = isEvading;
      } else {
         // BUG 5 FIX: Always reset stale evasion flag on non-moving ships
         ship._isEvadingVisually = false;
      }
  }

  evaluateGlobalDisruptions() {
    // Step 9 + 4 Upgrades: Push-based validation running intelligent Health Score tolerances
    this.shipments.forEach(ship => {
      if (ship.status !== 'moving' && ship.status !== 'waiting') return;
      
      // Enforce temporal cooldown window to stabilize reroute mapping storms (e.g., 5 seconds)
      // IMPORTANT: Skip cooldown for WAITING ships — they must be allowed to recover immediately when a blockade clears!
      if (ship.status === 'moving' && Date.now() - ship.lastRerouteTime < 5000) return;
      
      let isPathBlocked = false;
      let originalScore = 0;
      let newScore = 0;
      
      // Calculate isolated path segment health to dodge "global" scanning loops
      for (let i = ship.currentEdgeIndex; i < ship.pathEdges.length; i++) {
         const edge = ship.pathEdges[i];
         
         if ((edge.dynamic_time ?? edge.base_time) >= 900) {
            isPathBlocked = true;
            break;
         }

         const defaultParams = { dynamic_time: edge.base_time, dynamic_cost: edge.base_cost, dynamic_risk: edge.base_risk };
         originalScore += this.routingEngine.calculateEdgeScore(defaultParams, { w_time: 1, w_cost: 0.1, w_risk: 2.0 });
         newScore += this.routingEngine.calculateEdgeScore(edge, { w_time: 1, w_cost: 0.1, w_risk: 2.0 });
      }
      
      const volatility = originalScore > 0 ? (newScore / originalScore) * 100 : 100;
      ship.currentHealthDegradation = volatility;

      // If literally impassable, OR if severity degrades map health past 30% volatility threshold
      if (isPathBlocked || volatility > 130) {
         console.warn(`[INTELLIGENCE PULSE] Shipment ${ship.id} detected downstream volatility (Blocked: ${isPathBlocked}, Health Degraded: ${volatility.toFixed(0)}%). Executing evasive actions.`);
         ship.status = 'rerouting';
         this._handleReroute(ship);
      } else if (ship.status === 'waiting' && !isPathBlocked && volatility <= 130) {
         // TASK 1 FIX: Auto-Recovery Sequence
         // The blockade was dropped from the graph physics naturally. The ship boots back up!
         console.log(`[RECOVERY PULSE] Shipment ${ship.id} un-anchoring from WAIT mode. Egress physically verifiable.`);
         ship.status = 'rerouting'; 
         ship.lastRerouteTime = 0; // Immediate clearance bypass
         this._handleReroute(ship);
      }
    });
  }

  _handleReroute(ship) {
     // Isolate precise topological anchor dynamically checking logical progression (e.g. >50% completed = forward routing)
     let currentNode;
     if (ship.progress >= 0.5) {
        currentNode = ship.currentEdge.destination;
     } else {
        currentNode = ship.currentEdge.source;
     }
     let targetNode = ship.destination;

     // Attempt standard re-route dodging the blocked edges natively dropped by RoutingEngine
     let routingResult = this.routingEngine._dijkstra(currentNode, targetNode, { w_time: 1, w_cost: 0.1, w_risk: 2.0 });

     // PREDICTIVE AI: Wait vs Bypass Evaluation
     // BUG 3 FIX: Compare raw transit days (routingResult.totalTime) not the weighted score
     if (routingResult && routingResult.totalTime > 0) {
        const bypassTimeDays = routingResult.totalTime; // actual day count
        
        let origBaseTime = 0;
        for (let i = ship.currentEdgeIndex; i < ship.pathEdges.length; i++) {
           origBaseTime += ship.pathEdges[i].base_time;
        }

        let maxEventDuration = 0;
        if (window.simulation && window.simulation.events) {
           for (const ev of window.simulation.events.activeEvents.values()) {
              if (ev.durationDays && ev.durationDays > 0) {
                 maxEventDuration = Math.max(maxEventDuration, ev.durationDays);
              }
           }
        }
        
        // Wait + remaining original path < cost of full bypass detour?
        if (maxEventDuration > 0 && (origBaseTime + maxEventDuration < bypassTimeDays)) {
             console.log(`[PREDICTIVE AI] Shipment ${ship.id} elected to WAIT! (${(origBaseTime + maxEventDuration).toFixed(1)}d wait < ${bypassTimeDays.toFixed(1)}d bypass)`);
             ship.status = 'waiting';
             // LOOP FIX: Stamp lastRerouteTime so evaluateGlobalDisruptions doesn't immediately
             // re-trigger another reroute evaluation on this waiting ship in the same event cycle.
             ship.lastRerouteTime = Date.now();
             return;
        }
     }

     if (!routingResult || routingResult.edges.length === 0) {
        console.warn(`Shipment ${ship.id} destination ${targetNode} completely blockaded.`);
        
        // BUG 4 FIX: Reroute toward originalDestination — don't permanently mutate ship.destination
        // Try the real destination first (in case we previously deflected)
        const realDest = ship.originalDestination || ship.destination;
        if (realDest !== targetNode) {
           routingResult = this.routingEngine._dijkstra(currentNode, realDest, { w_time: 1, w_cost: 0.1, w_risk: 2.0 });
        }

        if (!routingResult || routingResult.edges.length === 0) {
           // True fallback: route to closest reachable neighbor
           const destEdges = this.routingEngine.graph.getEdges(realDest);
           let safeNeighbor = null;
           let lowestCost = Infinity;

           destEdges.forEach(e => {
              if (e.dynamic_time < 900) {
                 const cost = e.dynamic_time;
                 if (cost < lowestCost) {
                    lowestCost = cost;
                    safeNeighbor = e.destination === realDest ? e.source : e.destination;
                 }
              }
           });

           if (safeNeighbor) {
              console.log(`Shipment ${ship.id} temporary intercept to safe harbor: ${safeNeighbor}`);
              // Use temporary variable — do NOT mutate ship.destination permanently
              routingResult = this.routingEngine._dijkstra(currentNode, safeNeighbor, { w_time: 1, w_cost: 0.1, w_risk: 2.0 });
           }
        }

        if (!routingResult || routingResult.edges.length === 0) {
           console.error(`Shipment ${ship.id} totally trapped. Status fixed to waiting at ${currentNode}.`);
           ship.status = 'waiting';
           return;
        }
     }

     console.log(`Shipment ${ship.id} locked new evasive routing to ${targetNode}.`);
     
     ship.pathNodes = routingResult.path;
     ship.pathEdges = routingResult.edges;
     ship.currentEdgeIndex = 0;
     ship.currentEdge = routingResult.edges[0];
     ship.currentHealthDegradation = 100;
     ship.progress = 0.0;
     ship.lastRerouteTime = Date.now();
     ship._isEvadingVisually = false; // BUG 5 FIX: Always clear stale evasion on reroute
     ship.status = 'moving';
  }

  _updateShipmentPosition(ship) {
    const coords = ship.currentEdge.geometry;
    if (!coords || coords.length === 0) return;

    const totalSegments = coords.length - 1;
    if (totalSegments <= 0) {
       ship.currentLatLng = [coords[0][1], coords[0][0]]; 
       return;
    }

    let p = Math.max(0, Math.min(1, ship.progress));
    const exactSegmentIndex = p * totalSegments;
    const index = Math.floor(exactSegmentIndex);
    const segmentProgress = exactSegmentIndex - index;

    if (index >= totalSegments) {
       ship.currentLatLng = [coords[totalSegments][1], coords[totalSegments][0]];
       return;
    }

    const [lng1, lat1] = coords[index];
    const [lng2, lat2] = coords[index + 1];

    // Deal with antimeridian (Pacific Ocean Wrap) so the ship doesn't visually cut through the earth backwards
    let dLng = lng2 - lng1;
    if (dLng > 180) dLng -= 360;
    if (dLng < -180) dLng += 360;

    const currentLng = lng1 + dLng * segmentProgress;
    const currentLat = lat1 + (lat2 - lat1) * segmentProgress;
    
    // Explicitly DO NOT artificially bound to [-180, 180]. Leaflet polys project across +180 and -180.
    // If the path geometry flows to 242 (trans-pacific), the ship must flow to 242 to physically stay glued to the rendered arc.
    ship.currentLatLng = [currentLat, currentLng];
  }
}
