export class RouteAnalyzer {
  constructor(routingEngine, eventEngine) {
    this.routingEngine = routingEngine;
    this.eventEngine = eventEngine;
  }

  analyzeRouteRequest(source, destination, weights = { w_time: 1, w_cost: 0.1, w_risk: 1 }) {
    if (source === destination) return null;

    // 1. Get K Shortest Paths from live routing engine
    const rawPaths = this.routingEngine.getKShortestPaths(source, destination, weights, 3);
    if (!rawPaths || rawPaths.length === 0) return null;

    const analyzedRoutes = rawPaths.map((route, idx) => {
      const { path, edges, totalTime, totalCost, totalRisk, score } = route;
      
      let baseTime = 0;
      let dynamicTime = 0;
      const weakPoints = [];

      edges.forEach(edge => {
        baseTime += edge.base_time;
        dynamicTime += edge.dynamic_time;
        
        // Detect weak point: Significant inflation on edge transit time
        const delay = edge.dynamic_time - edge.base_time;
        if (delay > 0.5) { // Delay > 12 hours marks a critical bottleneck
          let cause = 'Operational Bottleneck';
          
          // Map back to live events for explanation
          if (this.eventEngine) {
             const activeEvents = Array.from(this.eventEngine.activeEvents.values());
             // Reverse through events to find most recent matching
             for (let i = activeEvents.length - 1; i >= 0; i--) {
                const ev = activeEvents[i];
                if (ev.rule && ev.rule.type === 'NODE' && ev.targetId === edge.source) {
                  cause = ev.rule.description || ev.rule.name; break;
                }
                else if (ev.rule && ev.rule.type === 'REGION' && edge.sourceNodeRegion?.includes(ev.targetId)) {
                  cause = ev.rule.description || ev.rule.name; break;
                }
                else if (ev.ruleKey === 'GEOGRAPHIC_DISRUPTION' && ev.position) {
                   // Crude geometric intersection mapping
                   const n = this.routingEngine.graph.getNode(edge.source);
                   if (n && n.lat && n.lng) {
                      const latDiff = Math.abs(ev.position.lat - n.lat);
                      const lngDiff = Math.abs(ev.position.lng - n.lng);
                      if (latDiff < 6 && lngDiff < 6) { // inside general storm AOE radius
                        cause = ev.rule.description || ev.rule.name; break;
                      }
                   }
                }
             }
          }
          
          weakPoints.push({
            nodeId: edge.source, 
            delay: delay, 
            cause: cause
          });
        }
      });

      const predictedDelay = Math.max(0, dynamicTime - baseTime);
      
      let riskLevel = 'Low';
      if (totalRisk > 50 || weakPoints.length > 2) riskLevel = 'High';
      else if (totalRisk > 20 || weakPoints.length > 0) riskLevel = 'Medium';

      // Deduplicate causes for explanation readability
      const uniqueCauses = [...new Set(weakPoints.map(wp => `${wp.cause} at ${wp.nodeId}`))];
      let explanation = uniqueCauses.length > 0
          ? `Delay driven by: ${uniqueCauses.slice(0, 2).join(', ')}`
          : `Clear sailing ahead — optimal weather/traffic conditions.`;

      return {
        id: `Option_${idx+1}`,
        rawRoute: route,
        name: idx === 0 ? 'Optimal Route' : idx === 1 ? 'Safest Detour' : 'Economic Bypass',
        totalTime: dynamicTime,
        basePathTime: baseTime,
        predictedDelay,
        riskLevel,
        weakPoints,
        explanation
      };
    });

    const recommendation = analyzedRoutes.shift(); 
    
    // Compute comparative intelligence
    let recReason = [
      `Avoids ${recommendation.weakPoints.length === 0 ? 'all active disruptions' : 'major critical zones'}`,
      `Maintains highest path integrity relative to risk exposure`
    ];

    if (analyzedRoutes.length > 0) {
      const alt = analyzedRoutes[0];
      const savedTime = alt.totalTime - recommendation.totalTime;
      if (savedTime > 0.5) {
        recReason.unshift(`Reduces global transit delay by ${savedTime.toFixed(1)} days`);
      }
    }

    recommendation.recommendationReason = recReason;

    return {
      source,
      destination,
      recommendation: recommendation,
      alternatives: analyzedRoutes
    };
  }
}
