export const EVENT_RULES = {
  GEOGRAPHIC_DISRUPTION: {
    name: 'Geographic Area Event',
    description: 'A disruption bound to a specific geographic radius affecting all intersecting marine corridors natively.',
    type: 'GEOMETRY' 
  },
  PORT_CLOSURE: {
    name: 'Terminal Lockout',
    description: 'Port operations completely shut down. No traffic allowed.',
    type: 'NODE',
    multipliers: { time: 999.0, cost: 999.0, risk: 999.0 }
  }
};

export const SEVERITY_MULTIPLIERS = {
  mild: 1.1,      // 10% delay
  warning: 1.25,   // 25% delay
  critical: 1.5,   // 50% delay
  blocked: 999.0   // Impassable
};

// Standard math distance for coordinate intersection
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const deltaPhi = (lat2-lat1) * Math.PI/180;
  const deltaLambda = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export class EventEngine {
  constructor(graph, mapRenderer) {
    this.graph = graph;
    this.mapRenderer = mapRenderer;
    this.activeEvents = new Map(); // id -> event details
  }

  // Example: injectGeometricEvent('storm1', {lat: 10, lng: 50}, 500000, 'warning', 'Monsoon block')
  injectGeometricEvent(id, position, radius, severity, description = "Areal Disruption", durationDays = null) {
     const event = {
        id,
        ruleKey: 'GEOGRAPHIC_DISRUPTION',
        rule: { name: description, description: `Severity: ${severity}` },
        position, // {lat, lng}
        radius,   // in meters
        severity, // mild, warning, critical, blocked
        timestamp: Date.now(),
        durationDays // Internal time bound execution limits
     };
     this.activeEvents.set(id, event);
     this._recalculateAllWeights();
  }

  clearEvent(id) {
    if(!this.activeEvents.has(id)) return;
    this.activeEvents.delete(id);
    this._recalculateAllWeights();
  }

  update(dt) {
     // Sycnhronized to exact same physics clock as ShipmentEngine
     const daysPassed = dt / 30000;

     let stateChanged = false;
     for (const [id, event] of this.activeEvents.entries()) {
        if (event.durationDays !== undefined && event.durationDays > 0) {
           event.durationDays -= daysPassed;
           if (event.durationDays <= 0) {
              console.log(`[TEMPORAL] Event ${id} naturally expired from internal physics state.`);
              this.activeEvents.delete(id);
              stateChanged = true;
           }
        }
     }
     
     if (stateChanged) {
        this._recalculateAllWeights();
     }
  }

  _applyEventImpact(event) {
    if (event.ruleKey === 'GEOGRAPHIC_DISRUPTION') {
      const edges = this.graph.getAllEdges();
      const mult = SEVERITY_MULTIPLIERS[event.severity] || 1.0;
      
      edges.forEach(edge => {
         if (!edge.geometry) return;
         
         // Mathematical ray-casting/intersection check
         // If ANY point in the geometry falls within the event radius, the edge is contaminated.
         // Wait, checking hundreds of points x edges is O(n^2), but we only do it ONCE when an event occurs! Perfect.
         let isContaminated = false;
         for (let i = 0; i < edge.geometry.length; i++) {
            const [lng, lat] = edge.geometry[i];
            const dist = haversineDistance(event.position.lat, event.position.lng, lat, lng);
            if (dist <= event.radius) {
               isContaminated = true;
               break;
            }
         }

         if (isContaminated) {
            edge.dynamic_time *= mult;
            edge.dynamic_cost *= mult;
            edge.dynamic_risk *= mult;
         }
      });
      console.log(`🌀 Applied Geometric Event [${event.severity}] to spatial intersections.`);
    }
  }

  _recalculateAllWeights() {
    // Reset to base
    const edges = this.graph.getAllEdges();
    edges.forEach(edge => {
      edge.dynamic_time = edge.base_time;
      edge.dynamic_cost = edge.base_cost;
      edge.dynamic_risk = edge.base_risk;
    });

    // Reapply all active events
    for (const event of this.activeEvents.values()) {
      this._applyEventImpact(event);
    }

    // Refresh UI Map overlays dynamically natively referencing EventEngine state
    if (this.mapRenderer) {
       this.mapRenderer.renderEvents(Array.from(this.activeEvents.values()));
    }

    // Trigger global push notification to all active agents (Step 9)
    if (window.simulation && window.simulation.shipments) {
        window.simulation.shipments.evaluateGlobalDisruptions();
    }
  }
}
