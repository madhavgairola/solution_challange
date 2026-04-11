export class Graph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  // Node { id, name, region, capacity, congestion_level, status }
  addNode(nodeData) {
    if (!this.nodes.has(nodeData.id)) {
      this.nodes.set(nodeData.id, nodeData);
      this.edges.set(nodeData.id, []);
    }
  }

  // Edge { source, destination, base_time, base_cost, base_risk, dynamic_time, dynamic_cost, dynamic_risk, capacity }
  addEdge(edgeData) {
    if (!this.nodes.has(edgeData.source) || !this.nodes.has(edgeData.destination)) {
      console.warn(`Cannot add edge ${edgeData.source} -> ${edgeData.destination}. Missing nodes.`);
      return;
    }

    // Assume directed edges for flexibility; if undirected, add inverse explicitly in network data
    const sourceEdges = this.edges.get(edgeData.source);
    
    // Check if edge already exists, if so update it
    const existingIdx = sourceEdges.findIndex(e => e.destination === edgeData.destination);
    
    // Initialize dynamic weights to base weights if not provided
    const edge = {
      ...edgeData,
      dynamic_time: edgeData.dynamic_time ?? edgeData.base_time,
      dynamic_cost: edgeData.dynamic_cost ?? edgeData.base_cost,
      dynamic_risk: edgeData.dynamic_risk ?? edgeData.base_risk,
    };

    if (existingIdx > -1) {
      sourceEdges[existingIdx] = edge;
    } else {
      sourceEdges.push(edge);
    }
  }

  getEdges(nodeId) {
    return this.edges.get(nodeId) || [];
  }

  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  getAllEdges() {
    const allEdges = [];
    for (const [source, edges] of this.edges.entries()) {
      allEdges.push(...edges);
    }
    return allEdges;
  }

  updateEdgeWeights(source, destination, newWeights) {
    const sourceEdges = this.edges.get(source);
    if (!sourceEdges) return;
    
    const existing = sourceEdges.find(e => e.destination === destination);
    if (existing) {
      Object.assign(existing, newWeights);
    }
  }
}
