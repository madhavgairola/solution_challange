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
      currentLatLng: null
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
      // or if risk goes critically high mid-transit, we need to handle it.
      if (edge.dynamic_time >= 900) {
         // The edge is blocked. 
         console.warn(`Shipment ${ship.id} encountered a blockade on edge ${edge.source}-${edge.destination}`);
         ship.status = 'rerouting';
         this._handleReroute(ship);
         return;
      }

      const currentDurationDays = edge.dynamic_time;
      const progressDelta = daysPassed / currentDurationDays;
      
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
    });
    
    // Transmit to visualization layer smoothly natively
    this.mapRenderer.renderShipments(Array.from(this.shipments.values()));
  }

  _handleReroute(ship) {
     // A ship caught mid-route during a blockage generally has to return to the source port of the current edge
     // and find a new route to the destination from there.
     const currentNode = ship.currentEdge.source;
     const routingResult = this.routingEngine._dijkstra(currentNode, ship.destination, { w_time: 1, w_cost: 0.1, w_risk: 2.0 });

     if (!routingResult || routingResult.edges.length === 0) {
        console.error(`Shipment ${ship.id} is totally trapped at ${currentNode}. Status set to waiting.`);
        ship.status = 'waiting';
        return;
     }

     console.log(`Shipment ${ship.id} successfully generated theoretical reroute path from ${currentNode}. Commencing turn around.`);
     
     ship.pathNodes = routingResult.path;
     ship.pathEdges = routingResult.edges;
     ship.currentEdgeIndex = 0;
     ship.currentEdge = routingResult.edges[0];
     
     // Reverse progress to simulate heading back to node?
     // Actually, if it's returning, we simply set progress = 0 logically and visually 'warp' it to the node, 
     // or just resume from 0 as if it successfully traversed the node. For real simulation we'd create a specific backtrack.
     ship.progress = 0.0;
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
    
    // Resolve Wrap coordinates purely for leaf visualization bounds
    let visLng = currentLng;
    if (visLng < -180) visLng += 360;
    else if (visLng > 180) visLng -= 360;

    ship.currentLatLng = [currentLat, visLng];
  }
}
