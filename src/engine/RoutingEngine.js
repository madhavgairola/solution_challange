export class RoutingEngine {
  constructor(graph) {
    this.graph = graph;
  }

  /**
   * Multi-Objective Cost Function
   * Computes dynamic weight of an edge based on configurable preference weights.
   * @param {Object} edge - The edge object from the graph
   * @param {Object} weights - { w_time: 1.0, w_cost: 1.0, w_risk: 1.0 }
   * @returns {Number} Comprehensive scored weight
   */
  calculateEdgeScore(edge, weights) {
    const { w_time = 1, w_cost = 1, w_risk = 1 } = weights;
    
    // Base features 
    // In a production system, these would fetch the "live" attributes taking into account disruptions
    const time = edge.dynamic_time ?? edge.base_time;
    const cost = edge.dynamic_cost ?? edge.base_cost;
    const risk = edge.dynamic_risk ?? edge.base_risk;

    return (time * w_time) + (cost * w_cost) + (risk * w_risk);
  }

  /**
   * Dijkstra's Algorithm implementation for the base shortest path
   * Supports node exclusion for Yen's Algorithm (K-Shortest Paths)
   */
  _dijkstra(source, target, weights, excludedNodes = new Set(), excludedEdges = new Set()) {
    // INTELLIGENCE OVERRIDE: Fast-Path Direct Connection
    // If the destination is a direct topological child of the current node, take it immediately!
    const directEdge = this.graph.getEdges(source).find(e => e.destination === target);
    if (directEdge && (directEdge.dynamic_time ?? directEdge.base_time) < 900) {
       const edgeId = `${source}-${target}`;
       if (!excludedEdges.has(edgeId) && !excludedNodes.has(target)) {
          return {
             path: [source, target],
             totalTime: directEdge.dynamic_time,
             totalCost: directEdge.dynamic_cost,
             totalRisk: directEdge.dynamic_risk,
             score: this.calculateEdgeScore(directEdge, weights),
             edges: [directEdge]
          };
       }
    }

    const distances = {};
    const previous = {};
    const unvisited = new Set();
    const edgesUsed = {};

    this.graph.nodes.forEach((_, node) => {
      distances[node] = Infinity;
      previous[node] = null;
      if (!excludedNodes.has(node)) {
        unvisited.add(node);
      }
    });

    distances[source] = 0;

    while (unvisited.size > 0) {
      // Get node with minimum distance
      let currNode = null;
      let minDistance = Infinity;
      for (const node of unvisited) {
        if (distances[node] < minDistance) {
          minDistance = distances[node];
          currNode = node;
        }
      }

      if (currNode === null) break; // All remaining nodes unreachable
      if (currNode === target) break; // Reached destination

      unvisited.delete(currNode);

      const neighbors = this.graph.getEdges(currNode);
      for (const edge of neighbors) {
        const neighbor = edge.destination;
        
        if (!unvisited.has(neighbor)) continue;
        
        // Exclude specific edges for Yen's algorithm
        const edgeId1 = `${currNode}-${neighbor}`;
        const edgeId2 = `${neighbor}-${currNode}`;
        if (excludedEdges.has(edgeId1) || excludedEdges.has(edgeId2)) continue;

        // Strict IMPASSABLE check (Black severity)
        if ((edge.dynamic_time ?? edge.base_time) >= 900) continue;

        const score = this.calculateEdgeScore(edge, weights);
        const totalDist = distances[currNode] + score;

        if (totalDist < distances[neighbor]) {
          distances[neighbor] = totalDist;
          previous[neighbor] = currNode;
          edgesUsed[neighbor] = edge;
        }
      }
    }

    if (distances[target] === Infinity) return null;

    // Reconstruct path and metrics
    const path = [];
    const pathEdges = [];
    let curr = target;
    
    let totalTime = 0, totalCost = 0, totalRisk = 0;

    while (curr !== null) {
      path.unshift(curr);
      if (curr !== source) {
        const edge = edgesUsed[curr];
        pathEdges.unshift(edge);
        totalTime += edge.dynamic_time;
        totalCost += edge.dynamic_cost;
        totalRisk += edge.dynamic_risk;
      }
      curr = previous[curr];
    }

    return { 
      path, 
      totalTime, 
      totalCost, 
      totalRisk, 
      score: distances[target], 
      edges: pathEdges 
    };
  }

  /**
   * Yen's Algorithm for K-Shortest Paths
   * Returns top topK loopless alternative paths
   */
  getKShortestPaths(source, target, weights = { w_time: 1, w_cost: 1, w_risk: 1 }, topK = 3) {
    const A = []; // The top K shortest paths
    const B = []; // Potential kth shortest paths

    // 1. Find the absolute shortest path
    const firstPath = this._dijkstra(source, target, weights);
    if (!firstPath) return []; // No paths exist
    A.push(firstPath);

    // 2. Iterate to find k-th shortest paths
    for (let k = 1; k < topK; k++) {
      const prevPath = A[k - 1].path;

      for (let i = 0; i < prevPath.length - 1; i++) {
        const spurNode = prevPath[i];
        const rootPath = prevPath.slice(0, i + 1);
        
        const excludedNodes = new Set();
        const excludedEdges = new Set();

        // Prevent loops by excluding nodes in the root path
        for (const rootNode of rootPath) {
          if (rootNode !== spurNode) {
            excludedNodes.add(rootNode);
          }
        }

        // Exclude edges that are part of already found paths sharing the SAME root path
        for (const validPathObj of A) {
          const validPath = validPathObj.path;
          let shareRoot = true;
          for (let idx = 0; idx <= i; idx++) {
            if (validPath[idx] !== rootPath[idx]) {
              shareRoot = false;
              break;
            }
          }
          if (shareRoot && validPath.length > i + 1) {
            excludedEdges.add(`${validPath[i]}-${validPath[i+1]}`);
          }
        }

        // Find spur path from spur node to target
        const spurPathObj = this._dijkstra(spurNode, target, weights, excludedNodes, excludedEdges);
        
        if (spurPathObj) {
          // Merge root path and spur path
          const fullPath = [...rootPath.slice(0, -1), ...spurPathObj.path];
          
          // Re-calculate total metrics
          let totalScore = 0, totalTime = 0, totalCost = 0, totalRisk = 0;
          for (let idx = 0; idx < fullPath.length - 1; idx++) {
             const from = fullPath[idx];
             const to = fullPath[idx+1];
             const edge = this.graph.getEdges(from).find(e => e.destination === to);
             totalScore += this.calculateEdgeScore(edge, weights);
             totalTime += edge.dynamic_time;
             totalCost += edge.dynamic_cost;
             totalRisk += edge.dynamic_risk;
          }

          const potentialPath = { 
            path: fullPath, 
            totalTime,
            totalCost,
            totalRisk,
            score: totalScore 
          };

          // Add to B if it's not already in B
          if (!B.some(p => p.path.join(',') === potentialPath.path.join(','))) {
            B.push(potentialPath);
          }
        }
      }

      if (B.length === 0) break;

      // Sort B by score and pick the lowest as the next path for A
      B.sort((a, b) => a.score - b.score);
      A.push(B.shift());
    }

    return A;
  }
}
