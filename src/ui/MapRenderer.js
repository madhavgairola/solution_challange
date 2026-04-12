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

    // Dynamically scale pathway line thicknesses and node sizes with map zooming to simulate true physical geographic size
    this.map.on('zoom', () => {
      this.updateVisualScales();
    });
  }

  updateVisualScales() {
    const zoom = this.map.getZoom();
    // Scale increased per user request. Zoom 2 becomes 1.5px, zoom 6 becomes 4.2px.
    const dynamicWeight = Math.max(1.0, zoom * 0.7);
    // Scale port radius: Zoom 2 becomes ~2.4px, Zoom 6 becomes ~7.2px
    const dynamicRadius = Math.max(2.0, zoom * 1.2);

    if (this.edgeLayers) {
      this.edgeLayers.forEach(layer => {
        if (layer.setStyle) {
          layer.setStyle({ weight: dynamicWeight });
        }
      });
    }

    if (this.nodeLayers) {
      this.nodeLayers.forEach(marker => {
        if (marker.setRadius) {
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
      
      if (drawn.has(pathId1) || drawn.has(pathId2)) return;
      drawn.add(pathId1);

      // Compute sea route geometry [lng, lat]
      const origin = [source.ocean_lng || source.lng, source.ocean_lat || source.lat];
      const destination = [dest.ocean_lng || dest.lng, dest.ocean_lat || dest.lat];

      try {
        const route = searoute(origin, destination);
        if (!route || !route.geometry || !route.geometry.coordinates) throw new Error('Searoute returned empty geometry');

        const currentZoomWeight = Math.max(1.0, this.map.getZoom() * 0.7);

        const layer = L.geoJSON(route, {
          style: { color: '#cbd5e1', weight: currentZoomWeight, opacity: 0.5, dashArray: '4, 4' } // Whitish-grey
        }).addTo(this.map);
        this.edgeLayers.set(pathId1, layer);

        if (source.ocean_lat) {
           L.polyline([[source.lat, source.lng], [source.ocean_lat, source.ocean_lng]], { color: '#64748b', weight: 1, dashArray: '2, 3', opacity: 0.8 }).addTo(this.map);
        }
        if (dest.ocean_lat) {
           L.polyline([[dest.lat, dest.lng], [dest.ocean_lat, dest.ocean_lng]], { color: '#64748b', weight: 1, dashArray: '2, 3', opacity: 0.8 }).addTo(this.map);
        }
      } catch (err) {
        // Trans-Pacific Wrap
        let sLng = origin[0]; let sLat = origin[1];
        let dLng = destination[0]; let dLat = destination[1];
        if (sLng > 100 && dLng < -50) dLng += 360;
        if (sLng < -50 && dLng > 100) sLng += 360;

        // Faint visual geometric connector approximating shipping curvature 
        const currentZoomWeight = Math.max(1.0, this.map.getZoom() * 0.7);
        const latlngs = this.generateOceanArc(sLat, sLng, dLat, dLng);
        const fallbackLine = L.polyline(latlngs, {
          color: '#cbd5e1', // Whitish-grey
          weight: currentZoomWeight, opacity: 0.5, dashArray: '2, 4'
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
}
