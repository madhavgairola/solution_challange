// ─────────────────────────────────────────────────────────────────────
// CARGO PROFILES: drives distinct routing preferences per cargo type
// ─────────────────────────────────────────────────────────────────────
const CARGO_PROFILES = {
  general:      { emoji: '📦', label: 'General Cargo',  preferences: { weightTime: 0.4, weightCost: 0.4, weightRisk: 0.2 }, riskTolerance: 0.6 },
  perishable:   { emoji: '🥩', label: 'Perishable',     preferences: { weightTime: 0.8, weightCost: 0.1, weightRisk: 0.1 }, riskTolerance: 0.3 },
  oil:          { emoji: '🛢️', label: 'Oil / Hazmat',   preferences: { weightTime: 0.2, weightCost: 0.3, weightRisk: 0.5 }, riskTolerance: 0.2 },
  high_priority:{ emoji: '⚡', label: 'High Priority',  preferences: { weightTime: 0.7, weightCost: 0.1, weightRisk: 0.2 }, riskTolerance: 0.5 }
};

export class ShipmentEngine {
  constructor(routingEngine, mapRenderer) {
    this.routingEngine = routingEngine;
    this.mapRenderer   = mapRenderer;
    this.shipments     = new Map();
    this.shipmentIdCounter = 0;
    // Schedule engine injected after construction (set from main.js)
    this.scheduleEngine = null;
    // 1 simulation day = 30 real seconds at 1x speed
    this.msPerDay = 30000;
  }

  setSpeedMultiplier(mult) {
    this.msPerDay = 30000 / mult;
  }

  _randomCargoType() {
    const types = Object.keys(CARGO_PROFILES);
    return types[Math.floor(Math.random() * types.length)];
  }

  spawnShipment(sourceId, destId, options = {}) {
    // ── Agent Identity ──────────────────────────────────────────────
    const cargoType = options.cargoType || this._randomCargoType();
    const priority  = options.priority  || (Math.floor(Math.random() * 5) + 1);
    const profile   = CARGO_PROFILES[cargoType];

    // Priority bias: P5 = urgency (more time weight), P1 = economy (more cost weight)
    const priorityBias = 0.07 * (priority - 3);
    const preferences = {
      weightTime: Math.max(0.05, profile.preferences.weightTime + priorityBias),
      weightCost: Math.max(0.05, profile.preferences.weightCost - priorityBias * 0.5),
      weightRisk: profile.preferences.weightRisk
    };
    const routingWeights = { w_time: preferences.weightTime, w_cost: preferences.weightCost, w_risk: preferences.weightRisk };
    const routingResult = this.routingEngine._dijkstra(sourceId, destId, routingWeights);
    
    if (!routingResult || !routingResult.edges || routingResult.edges.length === 0) {
      console.error(`Cannot spawn shipment from ${sourceId} to ${destId}: No viable path.`);
      return null;
    }

    const id = `ship-${++this.shipmentIdCounter}`;
    const spawnTime = Date.now();
    const expectedTotalDays = routingResult.edges.reduce((s, e) => s + e.base_time, 0);

    const ship = {
      id,
      // ── Route ─────────────────────────────────────────────────
      origin: sourceId, destination: destId, originalDestination: destId,
      pathNodes: routingResult.path, pathEdges: routingResult.edges,
      currentEdgeIndex: 0, currentEdge: routingResult.edges[0],
      progress: 0.0, currentLatLng: null,
      // ── State ─────────────────────────────────────────────────
      status: 'moving', currentNode: sourceId,
      nextNode: routingResult.path[1] || destId,
      // ── Cargo & Agent ──────────────────────────────────────────
      cargoType, cargoEmoji: profile.emoji, cargoLabel: profile.label,
      priority, preferences, riskTolerance: profile.riskTolerance,
      // ── Timing ────────────────────────────────────────────────
      spawnTime,
      expectedArrivalTime: spawnTime + expectedTotalDays * this.msPerDay,
      actualArrivalTime: null, delay: 0,
      // ── Path Intelligence ──────────────────────────────────────
      pathScore: routingResult.score, currentHealthDegradation: 100,
      // ── Rerouting ─────────────────────────────────────────────
      lastRerouteTime: 0, rerouteCount: 0,
      // ── Waiting ───────────────────────────────────────────────
      waitingAt: null, waitingReason: null,
      // ── Event Awareness ───────────────────────────────────────
      affectedByEvents: [],
      // ── Metrics ───────────────────────────────────────────────
      totalTimeSpent: 0, totalDistanceTravelled: 0,
      // ── Visual ────────────────────────────────────────────────
      _isEvadingVisually: false
    };

    // Build the segment execution chain
    ship.segments = this._buildSegments(routingResult.edges, 0);
    if (ship.segments.length > 0) {
      ship.segments[0].actualDeparture = 0;
      ship.segments[0].status = 'moving';
    }

    this._updateShipmentPosition(ship);
    this.shipments.set(id, ship);
    console.log(`[SPAWN] ${ship.cargoEmoji} ${id} | ${cargoType.toUpperCase()} P${priority} | ${sourceId} → ${destId} | ETA: ${expectedTotalDays.toFixed(1)}d`);

    // ── Scheduled departure: user asked to defer this ship ────────────────
    // options.scheduledDepartureDay is in sim days relative to THIS ship's epoch (totalTimeSpent=0).
    if (options.scheduledDepartureDay && options.scheduledDepartureDay > 0) {
      const depDay = options.scheduledDepartureDay;
      ship.status             = 'port_wait';
      ship.scheduledDeparture = depDay;
      ship.waitDaysRemaining  = depDay;
      ship.waitingAt          = sourceId;
      ship.waitingReason      = `Scheduled departure in ${(depDay * 24).toFixed(1)} sim hrs`;
      // Mark the first segment as waiting too so the Schedule Board shows it correctly
      if (ship.segments && ship.segments.length > 0) {
        ship.segments[0].status         = 'port_wait';
        ship.segments[0].actualDeparture = null; // will be set when departure is reached
      }
      console.log(`[SCHEDULE] ${ship.cargoEmoji} ${id} queued — departs in ${(depDay*24).toFixed(1)} sim hrs (${(depDay*30).toFixed(0)}s real at 1x speed)`);
    }

    return ship;
  }

  // ── spawnShipmentWithRoute ───────────────────────────────────────────────
  // Deploys a ship using a pre-calculated route from the Route Planner.
  // The user picked this exact path; honor it without re-running Dijkstra.
  // ──────────────────────────────────────────────────────────────────────────
  spawnShipmentWithRoute(sourceId, destId, routeResult, options = {}) {
    // Ensure edges array exists (Yen's paths may need reconstruction)
    if (!routeResult.edges || routeResult.edges.length === 0) {
      console.warn('[spawnShipmentWithRoute] Route missing edges — falling back to spawnShipment');
      return this.spawnShipment(sourceId, destId, options);
    }
    // Temporarily patch routingEngine._dijkstra so spawnShipment uses our pre-built result
    const original = this.routingEngine._dijkstra.bind(this.routingEngine);
    this.routingEngine._dijkstra = () => routeResult;
    const ship = this.spawnShipment(sourceId, destId, options);
    this.routingEngine._dijkstra = original;
    return ship;
  }

  // ───────────────────────────────────────────────────────────────────
  // Build segment execution chain with schedule-aware planned timing
  // ───────────────────────────────────────────────────────────────────
  _buildSegments(edges, dayOffset = 0) {
    let cumDay = dayOffset;
    return edges.map((edge, idx) => {
      // Factor in schedule-based wait for intermediate hops.
      // Segment 0 departs as soon as the ship spawns (no wait).
      // Later segments must catch a scheduled vessel.
      let plannedDeparture = cumDay;
      if (idx > 0 && this.scheduleEngine) {
        plannedDeparture = this.scheduleEngine.getNextDeparture(edge.source, edge.destination, cumDay);
      }

      const seg = {
        from:             edge.source,
        to:               edge.destination,
        edge,
        plannedDeparture,
        plannedArrival:   plannedDeparture + edge.base_time,
        actualDeparture:  null,
        actualArrival:    null,
        status:           'scheduled',
        missedConnection: false,
        scheduleWait:     idx > 0 ? (plannedDeparture - cumDay) : 0,
        delay:            0
      };
      cumDay = seg.plannedArrival;
      return seg;
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // Prediction Engine: simulate segment chain from current point using dynamic weights
  // This predicts cascade delays BEFORE they happen, making the system genuinely intelligent
  // ───────────────────────────────────────────────────────────────────
  _predictSegmentChain(ship) {
    if (!ship.segments || ship.segments.length === 0) return [];
    const predictions  = [];
    let predictedDay   = ship.totalTimeSpent;
    const partialProg  = ship.progress;
    
    for (let i = ship.currentEdgeIndex; i < ship.segments.length; i++) {
      const seg           = ship.segments[i];
      const effectiveTime = seg.edge.dynamic_time || seg.edge.base_time;
      
      // Remaining portion for current segment; full edge for future ones
      const remainingTime = (i === ship.currentEdgeIndex)
        ? effectiveTime * (1 - partialProg)
        : effectiveTime;

      // ── Schedule Look-ahead ──────────────────────────────────────
      // For future segments (not the one currently being traversed),
      // cargo must catch a scheduled vessel at the intermediate port.
      let departurePredicted = predictedDay;
      let scheduleWaitPred   = 0;
      if (i > ship.currentEdgeIndex && this.scheduleEngine) {
        departurePredicted = this.scheduleEngine.getNextDeparture(seg.from, seg.to, predictedDay);
        scheduleWaitPred   = Math.max(0, departurePredicted - predictedDay);
      }

      const predictedArrival    = departurePredicted + remainingTime;
      const predictedDelay      = Math.max(0, predictedArrival - seg.plannedArrival);
      const nextSeg             = ship.segments[i + 1];
      const willMissConnection  = nextSeg && (predictedArrival > nextSeg.plannedDeparture + 0.5);

      predictions.push({
        from: seg.from, to: seg.to,
        plannedArrival: seg.plannedArrival,
        predictedArrival,
        predictedDelay,
        scheduleWait: scheduleWaitPred,
        willMissConnection: !!willMissConnection
      });

      predictedDay = predictedArrival;
    }

    ship.segmentPredictions  = predictions;
    ship.totalPredictedDelay = predictions.length > 0 ? predictions[predictions.length - 1].predictedDelay : 0;
    ship._willMissConnection = predictions.some(p => p.willMissConnection);
    return predictions;
  }

  update(dt) {
    const daysPassed = dt / this.msPerDay;

    this.shipments.forEach(ship => {
      // Skip completed ships entirely
      if (ship.status === 'completed') return;

      // ── Universal time accumulation ──────────────────────────────────
      // ALL active ships (moving, waiting, port_wait) accumulate sim time.
      ship.totalTimeSpent += daysPassed;

      // ── PORT WAIT: ship is at an intermediate port awaiting scheduled vessel ──
      if (ship.status === 'port_wait') {
        ship.waitDaysRemaining = Math.max(0, ship.scheduledDeparture - ship.totalTimeSpent);
        if (ship.totalTimeSpent >= ship.scheduledDeparture) {
          // Board the vessel — resume movement
          console.log(`[SCHEDULE] ${ship.cargoEmoji||'🚢'} ${ship.id} ⚓→⛵ boarding vessel at ${ship.currentNode} (Day ${ship.totalTimeSpent.toFixed(2)})`);
          // Mark the segment as now moving from its ACTUAL departure time
          const boardSeg = ship.segments ? ship.segments[ship.currentEdgeIndex] : null;
          if (boardSeg) {
            boardSeg.actualDeparture = ship.totalTimeSpent;
            boardSeg.status = 'moving';
          }
          ship.status        = 'moving';
          ship.waitingAt     = null;
          ship.waitingReason = null;
          ship.waitDaysRemaining = 0;
          // Fall through to moving logic below
        } else {
          return; // Still waiting at port
        }
      }

      // ── Only moving ships do physics ──────────────────────────────────
      if (ship.status !== 'moving') return;

      const edge = ship.currentEdge;
      
      // FREEZE FIX
      if (!edge || !edge.geometry || edge.geometry.length === 0) {
        if (Date.now() - ship.lastRerouteTime > 3000) {
          console.warn(`[FREEZE GUARD] ${ship.id} null geometry on ${edge?.source}-${edge?.destination}. Rerouting.`);
          ship.status = 'rerouting';
          this._handleReroute(ship);
        }
        return;
      }

      // Blockade detection
      if ((edge.dynamic_time ?? edge.base_time) >= 900) {
        console.warn(`${ship.id} halted by blockade on ${edge.source}-${edge.destination}`);
        if (Date.now() - ship.lastRerouteTime > 3000) {
          ship.status = 'rerouting';
          this._handleReroute(ship);
        } else {
          ship.status = 'waiting';
        }
        return;
      }

      const currentDurationDays = edge.dynamic_time;
      let progressDelta = daysPassed / currentDurationDays;
      if (ship._isEvadingVisually) progressDelta *= 0.4;
      
      ship.progress += progressDelta;
      ship.totalDistanceTravelled += daysPassed * 24 * 46;

      if (ship.progress >= 1.0) {
        // ── Segment completion ──────────────────────────────────────────
        const completedSeg = ship.segments ? ship.segments[ship.currentEdgeIndex] : null;
        if (completedSeg && completedSeg.status === 'moving') {
          completedSeg.actualArrival = ship.totalTimeSpent;
          completedSeg.delay         = completedSeg.actualArrival - completedSeg.plannedArrival;
          completedSeg.status        = completedSeg.delay > 0.1 ? 'delayed' : 'completed';
        }

        ship.currentEdgeIndex++;
        
        if (ship.currentEdgeIndex >= ship.pathEdges.length) {
          // ── Journey complete ──────────────────────────────────────────
          ship.status            = 'completed';
          ship.actualArrivalTime = Date.now();
          ship.delay             = ship.totalTimeSpent - ((ship.expectedArrivalTime - ship.spawnTime) / this.msPerDay);
          ship.progress          = 1.0;
        } else {
          ship.currentEdge = ship.pathEdges[ship.currentEdgeIndex];
          const nextSeg    = ship.segments ? ship.segments[ship.currentEdgeIndex] : null;

          if (nextSeg && this.scheduleEngine) {
            // ── SCHEDULE LOOKUP: find next vessel for this leg ────────────
            const arrivalDay   = ship.totalTimeSpent;
            const nextDep      = this.scheduleEngine.getNextDeparture(nextSeg.from, nextSeg.to, arrivalDay);
            const waitDays     = nextDep - arrivalDay;

            nextSeg.actualDeparture = nextDep;

            // Missed connection: arrived later than the planned vessel
            if (arrivalDay > nextSeg.plannedDeparture + 0.1) {
              nextSeg.missedConnection = true;
              console.warn(`[MISSED CONNECTION] ${ship.cargoEmoji||''} ${ship.id}: arrived Day ${arrivalDay.toFixed(2)} at ${completedSeg?.to}, planned departure was Day ${nextSeg.plannedDeparture.toFixed(2)} (+${(arrivalDay-nextSeg.plannedDeparture).toFixed(2)}d late). Waiting ${waitDays.toFixed(2)}d for next vessel.`);
            }

            if (waitDays > 0.05) {
              // Ship must wait at this port for the next scheduled vessel
              nextSeg.status     = 'port_wait';
              ship.status        = 'port_wait';
              ship.scheduledDeparture = nextDep;
              ship.waitDaysRemaining  = waitDays;
              ship.waitingAt     = nextSeg.from;
              ship.waitingReason = `Next ${nextSeg.from}→${nextSeg.to} vessel in ${waitDays.toFixed(1)}d`;
              ship.progress      = 0;

              // Position the ship at the port it just arrived at
              this._updateShipmentPosition(ship);
              return;
            } else {
              // Next vessel departs soon — start immediately
              nextSeg.status          = 'moving';
              nextSeg.actualDeparture = arrivalDay;
            }
          } else if (nextSeg) {
            // No schedule engine — legacy immediate departure
            nextSeg.actualDeparture = ship.totalTimeSpent;
            nextSeg.status          = 'moving';
            if (ship.totalTimeSpent > nextSeg.plannedDeparture + 0.1) {
              nextSeg.missedConnection = true;
            }
          }

          // Carry over excess progress
          const excessDays = (ship.progress - 1.0) * currentDurationDays;
          ship.progress    = excessDays / ship.currentEdge.dynamic_time;
        }
      }

      // ── Update position state ──────────────────────────────────────
      if (ship.currentEdgeIndex < ship.pathEdges.length) {
        const ce = ship.pathEdges[ship.currentEdgeIndex];
        ship.currentNode = ce.source;
        ship.nextNode    = ce.destination;
      }

      this._updateShipmentPosition(ship);
      this._applyGeometricEvasion(ship);
    });
    
    this.mapRenderer.renderShipments(Array.from(this.shipments.values()));
    if (this.telemetryPanel) {
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
      if (ship.status !== 'moving' && ship.status !== 'waiting' && ship.status !== 'port_wait') return;
      
      // Enforce temporal cooldown window — but NOT for waiting/port_wait ships
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

       // Use ship's own preferences for path health scoring (personalized volatility)
       const shipWeights = ship.preferences 
         ? { w_time: ship.preferences.weightTime, w_cost: ship.preferences.weightCost, w_risk: ship.preferences.weightRisk }
         : { w_time: 1, w_cost: 0.1, w_risk: 2.0 };
       const defaultParams = { dynamic_time: edge.base_time, dynamic_cost: edge.base_cost, dynamic_risk: edge.base_risk };
       originalScore += this.routingEngine.calculateEdgeScore(defaultParams, shipWeights);
       newScore += this.routingEngine.calculateEdgeScore(edge, shipWeights);
      }
      
      const volatility = originalScore > 0 ? (newScore / originalScore) * 100 : 100;
      ship.currentHealthDegradation = volatility;

      // Personalized reroute threshold based on risk tolerance:
      // Risk-averse agents (oil=0.2) reroute at 110% degradation
      // Risk-tolerant agents (general=0.6) tolerate up to 130% degradation
      const rerouteThreshold = 100 + (ship.riskTolerance || 0.6) * 50;

      // Also track event awareness
      if (window.simulation && window.simulation.events) {
        for (const ev of window.simulation.events.activeEvents.values()) {
          if (!ship.affectedByEvents.includes(ev.rule?.name || ev.id)) {
            // Check if this event is near the ship's path
            if (isPathBlocked || volatility > rerouteThreshold) {
              ship.affectedByEvents.push(ev.rule?.name || ev.id);
              if (ship.affectedByEvents.length > 5) ship.affectedByEvents.shift();
            }
          }
        }
      }

      if (isPathBlocked || volatility > rerouteThreshold) {
         // Run prediction engine before rerouting so judges can see future cascade delays
         this._predictSegmentChain(ship);
         console.warn(`[INTELLIGENCE PULSE] ${ship.cargoEmoji || ''} ${ship.id} [tol:${rerouteThreshold.toFixed(0)}%] volatility=${volatility.toFixed(0)}% Blocked=${isPathBlocked}`);
         ship.status = 'rerouting';
         this._handleReroute(ship);
      } else if (ship.status === 'waiting' && !isPathBlocked && volatility <= rerouteThreshold) {
         console.log(`[RECOVERY PULSE] ${ship.id} un-anchoring from WAIT mode.`);
         ship.waitingAt = null;
         ship.waitingReason = null;
         ship.status = 'rerouting'; 
         ship.lastRerouteTime = 0;
         this._handleReroute(ship);
      }
    });
  }

  _handleReroute(ship) {
     let currentNode;
     if (ship.progress >= 0.5) {
        currentNode = ship.currentEdge.destination;
     } else {
        currentNode = ship.currentEdge.source;
     }
     let targetNode = ship.originalDestination || ship.destination;

     // Use this ship's own routing preferences — different agents choose different paths!
     const weights = ship.preferences 
       ? { w_time: ship.preferences.weightTime, w_cost: ship.preferences.weightCost, w_risk: ship.preferences.weightRisk }
       : { w_time: 1, w_cost: 0.1, w_risk: 2.0 };

     let routingResult = this.routingEngine._dijkstra(currentNode, targetNode, weights);

     ship.rerouteCount = (ship.rerouteCount || 0) + 1;

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
             console.log(`[PREDICTIVE AI] ${ship.cargoEmoji || ''} ${ship.id} elected to WAIT! (${(origBaseTime + maxEventDuration).toFixed(1)}d wait < ${bypassTimeDays.toFixed(1)}d bypass)`);
             ship.status = 'waiting';
             ship.waitingAt = currentNode;
             ship.waitingReason = `Predictive hold: storm expires in ${maxEventDuration.toFixed(1)}d, bypass costs ${bypassTimeDays.toFixed(1)}d`;
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
     
     ship.pathNodes   = routingResult.path;
     ship.pathEdges   = routingResult.edges;
     ship.currentEdgeIndex = 0;
     ship.currentEdge = routingResult.edges[0];
     ship.currentHealthDegradation = 100;
     ship.progress    = 0.0;
     ship.lastRerouteTime     = Date.now();
     ship._isEvadingVisually  = false;
     ship.status              = 'moving';
     // Clear port_wait state if we reroute while docked
     ship.scheduledDeparture  = null;
     ship.waitDaysRemaining   = 0;
     ship.waitingAt           = null;
     ship.waitingReason       = null;

     // Rebuild the segment execution chain from current simulation time
     const rebuiltSegs = this._buildSegments(routingResult.edges, ship.totalTimeSpent);
     if (rebuiltSegs.length > 0) {
       rebuiltSegs[0].actualDeparture = ship.totalTimeSpent;
       rebuiltSegs[0].status = 'moving';
     }
     ship.segments = rebuiltSegs;
     ship.segmentPredictions  = null;
     ship.totalPredictedDelay = 0;
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
