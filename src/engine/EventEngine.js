export const EVENT_RULES = {
  PORT_STRIKE: {
    name: 'Labor Strike',
    description: 'Work stoppage at port, causing massive delays and congestion.',
    type: 'NODE',
    multipliers: { time: 5.0, cost: 2.0, risk: 2.0 }
  },
  CANAL_BLOCKAGE: {
    name: 'Canal Blockage',
    description: 'Critical chokepoint completely blocked. Route impassable.',
    type: 'NODE', // Will affect all edges connected to this node
    multipliers: { time: 999.0, cost: 999.0, risk: 999.0 } // Effectively severs the path
  },
  WEATHER_STORM: {
    name: 'Severe Typhoon / Hurricane',
    description: 'Extreme weather causing vessel slow-steaming and routing hazards.',
    type: 'REGION', // Target region strings
    multipliers: { time: 2.0, cost: 1.5, risk: 5.0 }
  }
};

export class EventEngine {
  constructor(graph) {
    this.graph = graph;
    this.activeEvents = new Map(); // id -> event details
  }

  injectEvent(id, ruleKey, targetId) {
    const rule = EVENT_RULES[ruleKey];
    if (!rule) {
      console.warn(`Event rule ${ruleKey} not found.`);
      return;
    }

    const event = {
      id,
      ruleKey,
      targetId,
      rule,
      timestamp: Date.now()
    };

    this.activeEvents.set(id, event);
    this._applyEventImpact(event);
  }

  clearEvent(id) {
    const event = this.activeEvents.get(id);
    if (!event) return;
    
    this.activeEvents.delete(id);
    this._recalculateAllWeights();
  }

  _applyEventImpact(event) {
    const { rule, targetId } = event;

    if (rule.type === 'NODE') {
      // Find all edges associated with this node and apply multipliers
      const edges = this.graph.getAllEdges();
      edges.forEach(edge => {
        if (edge.source === targetId || edge.destination === targetId) {
          edge.dynamic_time *= rule.multipliers.time;
          edge.dynamic_cost *= rule.multipliers.cost;
          edge.dynamic_risk *= rule.multipliers.risk;
        }
      });
      console.log(`🌀 Applied ${rule.name} impact to node ${targetId}`);
    } 
    else if (rule.type === 'REGION') {
      // Find all nodes in region, then affect their edges
      const nodesInRegion = this.graph.getAllNodes().filter(n => n.region.includes(targetId));
      const regionNodeIds = new Set(nodesInRegion.map(n => n.id));
      
      const edges = this.graph.getAllEdges();
      edges.forEach(edge => {
        if (regionNodeIds.has(edge.source) && regionNodeIds.has(edge.destination)) {
          // Both in region = full impact
          edge.dynamic_time *= rule.multipliers.time;
          edge.dynamic_cost *= rule.multipliers.cost;
          edge.dynamic_risk *= rule.multipliers.risk;
        } else if (regionNodeIds.has(edge.source) || regionNodeIds.has(edge.destination)) {
          // Edge entering/leaving region = half impact
          edge.dynamic_time *= 1 + ((rule.multipliers.time - 1) / 2);
          edge.dynamic_cost *= 1 + ((rule.multipliers.cost - 1) / 2);
          edge.dynamic_risk *= 1 + ((rule.multipliers.risk - 1) / 2);
        }
      });
      console.log(`⛈️ Applied ${rule.name} impact to region ${targetId}`);
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
  }
}
