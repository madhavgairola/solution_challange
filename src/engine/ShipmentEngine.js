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
      status: 'moving', // moving, delayed, rerouting, waiting, completed
      pathNodes: routingResult.path,
      pathEdges: routingResult.edges,
      
      currentEdgeIndex: 0,
      currentEdge: routingResult.edges[0],
      progress: 0.0, // 0.0 to 1.0 along currentEdge
      currentLatLng: null,
      
      currentHealthDegradation: 100, // baseline for UI telemetry 
      lastRerouteTime: 0 // Cooldown protection lock
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
      if (!edge || !edge.geometry) return;

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
      
      // Physically slow down the agent when traversing extended geometric outer-bounds
      if (ship._isEvadingVisually) {
         progressDelta *= 0.55; 
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
    
    // Transmit to visualization layer smoothly natively
    this.mapRenderer.renderShipments(Array.from(this.shipments.values()));
    if (this.telemetryPanel) {
       this.telemetryPanel.update(Array.from(this.shipments.values()));
    }
  }

  _applyGeometricEvasion(ship) {
      if (!ship.currentLatLng || !window.simulation || !window.simulation.events) return;
      
      const activeEvents = window.simulation.events.activeEvents;
      let isEvading = false;

      for (const event of activeEvents.values()) {
         if (!event.position || !event.radius || event.ruleKey !== 'GEOGRAPHIC_DISRUPTION') continue;

         // Quick cartesian bounds bypass optimization
         if (Math.abs(ship.currentLatLng[0] - event.position.lat) > 10 || Math.abs(ship.currentLatLng[1] - event.position.lng) > 10) continue;

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
     if (routingResult) {
        let bypassTime = routingResult.totalTime;
        
        let origBaseTime = 0;
        for (let i = ship.currentEdgeIndex; i < ship.pathEdges.length; i++) {
           origBaseTime += ship.pathEdges[i].base_time;
        }

        let maxEventDuration = 0;
        if (window.simulation && window.simulation.events) {
           for (const ev of window.simulation.events.activeEvents.values()) {
              if (ev.durationDays) maxEventDuration = Math.max(maxEventDuration, ev.durationDays);
           }
        }
        
        // If dropping anchor and waiting for the storm to expire is mathematically faster than the detour...
        // e.g. Bypass takes 20 days. Normal path takes 5 days. Storm lasts 3 days. Wait (8d) < Bypass (20d).
        if (maxEventDuration > 0 && (origBaseTime + maxEventDuration < bypassTime)) {
             console.log(`[PREDICTIVE AI] Shipment ${ship.id} elected to WAIT! (${(origBaseTime + maxEventDuration).toFixed(1)}d predicted < ${bypassTime.toFixed(1)}d bypass)`);
             ship.status = 'waiting';
             return;
        }
     }

     if (!routingResult || routingResult.edges.length === 0) {
        console.warn(`Shipment ${ship.id} destination ${targetNode} completely blockaded.`);
        
        // INTELLIGENCE FALLBACK: Find closest geographical safe neighbor to the blocked destination
        // Grab the edges coming IN or OUT of the destination that aren't blocked!
        const destEdges = this.routingEngine.graph.getEdges(targetNode);
        let safeNeighbor = null;
        let lowestCost = Infinity;

        destEdges.forEach(e => {
           if (e.dynamic_time < 900) {
              const cost = e.dynamic_time;
              if (cost < lowestCost) {
                 lowestCost = cost;
                 safeNeighbor = e.destination === targetNode ? e.source : e.destination;
              }
           }
        });

        if (safeNeighbor) {
           console.log(`Shipment ${ship.id} defaulting delivery intercept to nearby safe harbor: ${safeNeighbor}`);
           targetNode = safeNeighbor;
           ship.destination = safeNeighbor; // Perm-update manifest
           routingResult = this.routingEngine._dijkstra(currentNode, targetNode, { w_time: 1, w_cost: 0.1, w_risk: 2.0 });
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
     ship.currentHealthDegradation = 100; // Reset telemetry baseline upon successful evasive re-pathing
     
     // Reverse progress to simulate heading back to node?
     // Actually, if it's returning, we simply set progress = 0 logically and visually 'warp' it to the node, 
     // or just resume from 0 as if it successfully traversed the node. For real simulation we'd create a specific backtrack.
     ship.progress = 0.0;
     ship.lastRerouteTime = Date.now();
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
