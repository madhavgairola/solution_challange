import L from 'leaflet';
import searoute from 'searoute-js';

window.IndiaBoundaryCorrector.extendLeaflet(L);

export class MapRenderer {
  constructor(containerId) {
    this.map = L.map(containerId).setView([20, 0], 2); // Center world map

    // Add CartoDB Dark Matter tile layer mapped to official boundaries
    L.tileLayer.indiaBoundaryCorrected('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      layerConfig: 'cartodb-dark',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    this.nodeLayers = new Map();
    this.edgeLayers = new Map();
    this.shipmentLayers = new Map();
    this.eventLayers = new Map();
    this.activePortId = null;

    // Dynamically scale pathway line thicknesses and node sizes with map zooming to simulate true physical geographic size
    this.map.on('zoom', () => {
      this.updateVisualScales();
    });
  }

  setActivePort(portId, targetDestId = null) {
    this.activePortId = portId;
    this.activeDestId = targetDestId;
    this.updateVisualScales();
  }

  updateVisualScales() {
    const zoom = this.map.getZoom();
    // Scale increased per user request. Zoom 2 becomes 1.5px, zoom 6 becomes 4.2px.
    const dynamicWeight = Math.max(1.0, zoom * 0.7);
    // Scale port radius: Zoom 2 becomes ~2.4px, Zoom 6 becomes ~7.2px
    const dynamicRadius = Math.max(2.0, zoom * 1.2);

    if (this.edgeLayers) {
      this.edgeLayers.forEach((layer, pathId) => {
        if (!layer.setStyle) return;

        if (this.activePortId) {
          let isHighlighted = false;
          if (this.activeDestId) {
            if (pathId === `${this.activePortId}-${this.activeDestId}` || pathId === `${this.activeDestId}-${this.activePortId}`) {
              isHighlighted = true;
            }
          } else {
            if (pathId.startsWith(this.activePortId + '-') || pathId.endsWith('-' + this.activePortId)) {
              isHighlighted = true;
            }
          }

          if (isHighlighted) {
            layer.setStyle({ color: '#3ecf8e', opacity: 1.0, weight: dynamicWeight * 1.5 });
            if (layer.bringToFront) layer.bringToFront();
          } else {
            layer.setStyle({ color: '#cbd5e1', opacity: 0.15, weight: dynamicWeight * 0.8 });
          }
        } else {
          layer.setStyle({ color: '#cbd5e1', opacity: 0.5, weight: dynamicWeight });
        }
      });
    }

    if (this.nodeLayers) {
      this.nodeLayers.forEach((marker, id) => {
        if (!marker.setRadius) return;

        if (this.activePortId) {
          const isActiveNode = id === this.activePortId || (this.activeDestId && id === this.activeDestId);
          if (isActiveNode) {
            marker.setStyle({ fillColor: '#3ecf8e', color: '#10b981', weight: 2, fillOpacity: 1.0 });
            marker.setRadius(dynamicRadius * 2);
            marker.bringToFront();
          } else {
            marker.setStyle({ fillColor: 'rgba(255, 255, 255, 0.25)', color: 'transparent', weight: 0 });
            marker.setRadius(dynamicRadius);
          }
        } else {
          marker.setStyle({ fillColor: 'rgba(255, 255, 255, 0.25)', color: 'transparent', weight: 0 });
          marker.setRadius(dynamicRadius);
        }
      });
    }
  }

  // Draw or update nodes
  renderNodes(nodes) {
    nodes.forEach(node => {
      // Do not draw raw graphical circles for invisible waypoints
      if (node.status === 'waypoint') return;

      if (!this.nodeLayers.has(node.id) && node.lat !== undefined && node.lng !== undefined) {
        const initialRadius = Math.max(2.0, this.map.getZoom() * 1.2);
        
        const marker = L.circleMarker([node.lat, node.lng], {
          radius: initialRadius, 
          fillColor: 'rgba(255, 255, 255, 0.25)', 
          color: 'transparent',
          weight: 0,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(this.map);

        marker.bindTooltip(`<b>${node.name}</b><br/>Region: ${node.region}`, {
          direction: 'top',
          offset: [0, -10]
        });

        marker.on('click', () => {
          if (this.sidebar) {
            this.sidebar.showPortDetails(node.id);
          }
        });

        this.nodeLayers.set(node.id, marker);
      }
    });
  }

  // Generate pseudo-Great-Circle arcs for long oceanic transit to bypass geometry snapping failures
  generateOceanArc(sLat, sLng, dLat, dLng) {
    const points = [];
    const steps = 30;
    // Bend curvature to simulate Great Circle physics natively on Mercator projections
    const bendFactor = Math.abs(dLng - sLng) > 50 ? 20 : 5;
    const midLat = (sLat + dLat) / 2 + (sLat > 0 ? bendFactor : -bendFactor); 
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = (1 - t) * (1 - t) * sLat + 2 * (1 - t) * t * midLat + t * t * dLat;
      const lng = sLng + t * (dLng - sLng);
      points.push([lat, lng]);
    }
    return points;
  }

  // Draw or update topological network edges
  renderEdges(nodes, edges) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const drawn = new Set();
    
    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const dest = nodeMap.get(edge.destination);
      
      if (!source || !dest || !source.lat || !source.lng || !dest.lat || !dest.lng) return;

      const pathId1 = `${edge.source}-${edge.destination}`;
      const pathId2 = `${edge.destination}-${edge.source}`;
      
      if (drawn.has(pathId1) || drawn.has(pathId2)) {
        // THE FIX: If the sibling direction was already drawn, copy its geometry (reversed)
        // so this directional edge object is never left with geometry = null.
        if (!edge.geometry) {
          const sibling = edges.find(e => e.source === edge.destination && e.destination === edge.source);
          if (sibling && sibling.geometry) {
            edge.geometry = [...sibling.geometry].reverse();
          }
        }
        return;
      }
      drawn.add(pathId1);

      // Compute sea route geometry [lng, lat]
      const origin = [source.ocean_lng || source.lng, source.ocean_lat || source.lat];
      const destination = [dest.ocean_lng || dest.lng, dest.ocean_lat || dest.lat];

      try {
        const route = searoute(origin, destination);
        if (!route || !route.geometry || !route.geometry.coordinates) throw new Error('Searoute returned empty geometry');

        // BIND PHYSICAL GEOMETRY COORDINATES TO EDGE OBJECT FOR SIMULATION ENGINE
        edge.geometry = route.geometry.coordinates;

        // Copy geometry to the reverse-direction sibling so it never freezes when Dijkstra uses it
        const reverseEdge = edges.find(e => e.source === edge.destination && e.destination === edge.source);
        if (reverseEdge && !reverseEdge.geometry) {
          reverseEdge.geometry = [...route.geometry.coordinates].reverse();
        }

        const currentZoomWeight = Math.max(1.0, this.map.getZoom() * 0.7);

        // Only style when newly drawn, let updateVisualScales handle the rest immediately after initialization
        const currentOpacity = this.activePortId ? (pathId1.startsWith(this.activePortId + '-') || pathId1.endsWith('-' + this.activePortId) ? 1.0 : 0.15) : 0.5;
        const currentColor = this.activePortId && (pathId1.startsWith(this.activePortId + '-') || pathId1.endsWith('-' + this.activePortId)) ? '#3ecf8e' : '#cbd5e1';

        const layer = L.geoJSON(route, {
          style: { color: currentColor, weight: currentZoomWeight, opacity: currentOpacity, dashArray: '4, 4' } // Whitish-grey
        }).addTo(this.map);
        this.edgeLayers.set(pathId1, layer);

        if (source.ocean_lat) {
           L.polyline([[source.lat, source.lng], [source.ocean_lat, source.ocean_lng]], { color: '#64748b', weight: 1, dashArray: '2, 3', opacity: 0.8 }).addTo(this.map);
        }
        if (dest.ocean_lat) {
           L.polyline([[dest.lat, dest.lng], [dest.ocean_lat, dest.ocean_lng]], { color: '#64748b', weight: 1, dashArray: '2, 3', opacity: 0.8 }).addTo(this.map);
        }
      } catch (err) {
        // Fallback drawing if searoute blockades
        console.warn(`Fallback mapping active for edge ${edge.source}-${edge.destination}`);
        
        // Trans-Pacific Wrap
        let sLng = origin[0]; let sLat = origin[1];
        let dLng = destination[0]; let dLat = destination[1];
        if (sLng > 100 && dLng < -50) dLng += 360;
        if (sLng < -50 && dLng > 100) sLng += 360;

        // Faint visual geometric connector approximating shipping curvature 
        const currentZoomWeight = Math.max(1.0, this.map.getZoom() * 0.7);
        const latlngs = this.generateOceanArc(sLat, sLng, dLat, dLng);

        // BIND PHYSICAL GEOMETRY COORDINATES TO EDGE OBJECT FOR SIMULATION ENGINE
        edge.geometry = latlngs.map(l => [l[1], l[0]]); // GeoJSON specification requires [lng, lat]
        
        // Copy reversed fallback to sibling edge too
        const reverseEdgeFallback = edges.find(e => e.source === edge.destination && e.destination === edge.source);
        if (reverseEdgeFallback && !reverseEdgeFallback.geometry) {
          reverseEdgeFallback.geometry = latlngs.map(l => [l[1], l[0]]).reverse();
        }

        const currentOpacity = this.activePortId ? (pathId1.startsWith(this.activePortId + '-') || pathId1.endsWith('-' + this.activePortId) ? 1.0 : 0.15) : 0.5;
        const currentColor = this.activePortId && (pathId1.startsWith(this.activePortId + '-') || pathId1.endsWith('-' + this.activePortId)) ? '#3ecf8e' : '#cbd5e1';

        const fallbackLine = L.polyline(latlngs, {
          color: currentColor, // Whitish-grey
          weight: currentZoomWeight, opacity: currentOpacity, dashArray: '2, 4'
        }).addTo(this.map);
        this.edgeLayers.set(pathId1, fallbackLine);
      }
    });
  }

  updateRouteDisplay(pathNodes, color = '#10b981') {
    if (this.currentHighlight) {
      this.currentHighlight.remove();
    }
  } // deprecated, kept for safety

  drawCalculatedRoutes(routes, graph) {
    // Clear old route highlight layers
    if (this.routeHighlights) {
      this.routeHighlights.forEach(layer => layer.remove());
    }
    this.routeHighlights = [];

    const dynamicRadius = Math.max(2.0, this.map.getZoom() * 1.2);

    // Reset standard nodes to dynamically scaled resting translucent dots
    this.nodeLayers.forEach(marker => {
      marker.setStyle({ fillColor: 'rgba(255, 255, 255, 0.25)', color: 'transparent', weight: 0 });
      marker.setRadius(dynamicRadius);
    });

    if (!routes || routes.length === 0) return;

    const activeNodeIds = new Set();

    // Modern, ultra-clean UI representations for exact pathing without visual bloat
    const configs = [
      { color: '#3ecf8e', weight: 3, dashArray: null, opacity: 1.0 }, // Optimal: Solid Supabase Green
      { color: '#fbbf24', weight: 3, dashArray: '6, 6', opacity: 0.9 }, // Alt 1: Consistent dashed amber
      { color: '#f97316', weight: 4, dashArray: '2, 8', opacity: 0.8 }  // Alt 2: Thicker dotted orange
    ];

    routes.forEach((routeObj, idx) => {
      const config = configs[idx] || configs[configs.length - 1]; 
      const pathNodeIds = routeObj.path;
      if (pathNodeIds.length < 2) return;

      pathNodeIds.forEach(id => activeNodeIds.add(id));

      for (let i = 0; i < pathNodeIds.length - 1; i++) {
        const source = graph.getNode(pathNodeIds[i]);
        const dest = graph.getNode(pathNodeIds[i+1]);
        
        if (!source || !dest) continue;

        let sLng = source.ocean_lng || source.lng;
        let sLat = source.ocean_lat || source.lat;
        let dLng = dest.ocean_lng || dest.lng;
        let dLat = dest.ocean_lat || dest.lat;

        // Ensure we draw the connector line to the true inland port
        if (source.ocean_lat) {
           const conn = L.polyline([[source.lat, source.lng], [sLat, sLng]], config).addTo(this.map);
           this.routeHighlights.push(conn);
        }
        if (dest.ocean_lat) {
           const conn = L.polyline([[dest.lat, dest.lng], [dLat, dLng]], config).addTo(this.map);
           this.routeHighlights.push(conn);
        }

        try {
           const rt = searoute([sLng, sLat], [dLng, dLat]);
           if (!rt || !rt.geometry || !rt.geometry.coordinates) throw new Error('Searoute returned empty geometry');
           const segment = L.geoJSON(rt, { style: config }).addTo(this.map);
           this.routeHighlights.push(segment);
        } catch (e) {
           // Trans-Pacific Wrap for fallback highlights
           if (sLng > 100 && dLng < -50) dLng += 360;
           if (sLng < -50 && dLng > 100) sLng += 360;

           const arcCoords = this.generateOceanArc(sLat, sLng, dLat, dLng);
           const segment = L.polyline(arcCoords, config).addTo(this.map);
           this.routeHighlights.push(segment);
        }
      }
    });

    // Highlight all active nodes in Supabase Green
    activeNodeIds.forEach(id => {
       const marker = this.nodeLayers.get(id);
       if (marker) {
          marker.setStyle({ fillColor: '#3ecf8e', color: '#24b47e', radius: 4, weight: 2, fillOpacity: 1.0 });
          marker.bringToFront();
       }
    });

    // Ensure they draw over the grey baselines but slightly ordered (optimal on top)
    this.routeHighlights.slice().reverse().forEach(layer => layer.bringToFront());
  }

  applyDisruptionVisuals(activeEvents, graph) {
    // Reset all nodes to tiny resting background dots
    this.nodeLayers.forEach((marker, id) => {
      marker.setStyle({ fillColor: 'rgba(255, 255, 255, 0.25)', color: 'transparent', radius: 2, weight: 0 });
    });

    activeEvents.forEach(evt => {
       if (evt.rule.type === 'NODE') {
          const marker = this.nodeLayers.get(evt.targetId);
          if (marker) {
              // Threat indicator
              marker.setStyle({ color: '#ef4444', fillColor: '#f87171', radius: 7, weight: 2 }); 
              marker.bringToFront();
          }
       } else if (evt.rule.type === 'REGION') {
          const nodesInRegion = graph.getAllNodes().filter(n => n.region.includes(evt.targetId));
          nodesInRegion.forEach(n => {
              const marker = this.nodeLayers.get(n.id);
              if (marker) {
                  marker.setStyle({ color: '#f59e0b', fillColor: '#fbbf24', radius: 6, weight: 2 }); // Yellow/Orange for region threat
                  marker.bringToFront();
              }
          });
       }
    });
  }

  // Draw distinct area-of-effect severity zones across the map for events
  renderEvents(events) {
     const activeIds = new Set(events.map(e => e.id));
     
     // Remove stale
     for (const [id, layer] of this.eventLayers.entries()) {
        if (!activeIds.has(id)) {
           this.map.removeLayer(layer);
           this.eventLayers.delete(id);
        }
     }

     // Add or Update
     events.forEach(e => {
        if (!e.position || !e.severity) return; // Must have geospatial anchor

        let color = '#fbbf24'; // Yellow
        if (e.severity === 'warning') color = '#fb923c'; // Orange
        if (e.severity === 'critical') color = '#ef4444'; // Red
        if (e.severity === 'blocked') color = '#000000'; // Black

        if (this.eventLayers.has(e.id)) {
           // Update existing silently
           const layer = this.eventLayers.get(e.id);
           layer.setStyle({ color: color, fillColor: color });
        } else {
           // Create
           const circle = L.circle([e.position.lat, e.position.lng], {
              color: color,
              fillColor: color,
              fillOpacity: 0.2,
              weight: 2,
              radius: e.radius || 300000 // 300km default
           }).addTo(this.map);

           circle.bindTooltip(`<b>${e.rule.name}</b><br/>${e.rule.description}`, { direction: 'top' });
           this.eventLayers.set(e.id, circle);
        }
     });
  }

  // 60-FPS render hook called by ShipmentEngine tightly integrating the exact physical coordinates
  renderShipments(shipments) {
     const activeIds = new Set();
     
     shipments.forEach(ship => {
        if (ship.status !== 'moving' && ship.status !== 'delayed' && ship.status !== 'rerouting' && ship.status !== 'waiting') return;
        if (!ship.currentLatLng) return;

        activeIds.add(ship.id);

        let marker = this.shipmentLayers.get(ship.id);
        if (!marker) {
          // Initialize Visual Representation
          const icon = L.divIcon({
            className: 'custom-ship-icon',
            html: `<div class="ship-dot" id="marker-${ship.id}"></div>`,
            iconSize: [12, 12]
          });
          marker = L.marker(ship.currentLatLng, { icon }).addTo(this.map);
          this.shipmentLayers.set(ship.id, marker);
        } else {
          // Update frame location smoothly natively tracking geographical state
          marker.setLatLng(ship.currentLatLng);

          // DOM Inject dynamic visual math telemetry (Semantic Coloring)
          const domElement = document.getElementById(`marker-${ship.id}`);
          if (domElement) {
             let activeColor = '#38bdf8'; // Blue (Normal)
             
             if (ship.status === 'rerouting') {
                activeColor = '#f43f5e'; // Red (Blocked / Evasive)
             } else if (ship.status === 'waiting') {
                activeColor = '#fbbf24'; // Yellow (Cooldown)
             } else if (ship._isEvadingVisually) {
                activeColor = '#d946ef'; // Magenta (Ray Evasion Geometry Active)
             } else if (ship.currentHealthDegradation && ship.currentHealthDegradation > 115) {
                activeColor = '#fb923c'; // Orange-Yellow (Degraded Health Tolerance)
             }

             // Only hit the DOM if the state changed to save frame drops
             if (domElement.style.backgroundColor !== activeColor) {
               domElement.style.backgroundColor = activeColor;
               domElement.style.boxShadow = `0 0 10px ${activeColor}, 0 0 20px ${activeColor}`;
             }
          }
        }
     });

     // Sweep dead shipments
     for (const [id, marker] of this.shipmentLayers.entries()) {
        if (!activeIds.has(id)) {
           this.map.removeLayer(marker);
           this.shipmentLayers.delete(id);
        }
     }
  }
}
