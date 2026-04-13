import L from 'leaflet';
import searoute from 'searoute-js';

window.IndiaBoundaryCorrector.extendLeaflet(L);

export class MapRenderer {
  constructor(containerId) {
    this.map = L.map(containerId, { zoomControl: false }).setView([20, 0], 2); // Center world map

    // Add CartoDB Dark Matter tile layer mapped to official boundaries
    L.tileLayer.indiaBoundaryCorrected('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      layerConfig: 'cartodb-dark',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    this.nodeLayers      = new Map();
    this.edgeLayers      = new Map();
    this.shipmentLayers  = new Map();
    this.eventLayers     = new Map();
    this.activePortId    = null;
    this.selectedShipId  = null;   // currently clicked ship
    this.shipRouteLayer  = null;   // Leaflet layer group for ship route highlight
    this.shipPopup       = null;   // floating info popup

    // Click map blank area → deselect ship
    this.map.on('click', () => this.clearShipRouteHighlight());

    this.map.on('zoom', () => this.updateVisualScales());
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

  // ── Clear highlighted ship route ──────────────────────────────────────────
  clearShipRouteHighlight() {
    if (this.shipRouteLayer) {
      this.map.removeLayer(this.shipRouteLayer);
      this.shipRouteLayer = null;
    }
    if (this.shipPopup) {
      this.map.closePopup(this.shipPopup);
      this.shipPopup = null;
    }
    // Reset all ship markers to default size
    this.shipmentLayers.forEach((marker, id) => {
      const el = document.getElementById(`marker-${id}`);
      if (el) { el.style.transform = ''; el.style.zIndex = ''; }
    });
    this.selectedShipId = null;
  }

  // ── Draw full route for a clicked ship ───────────────────────────────────
  showShipRoute(ship) {
    this.clearShipRouteHighlight();
    this.selectedShipId = ship.id;

    const layers = [];
    const segs   = ship.segments || [];
    const graph  = window.simulation?.graph;

    // Draw each edge geometry
    ship.pathEdges.forEach((edge, idx) => {
      if (!edge.geometry || edge.geometry.length === 0) return;

      const isCompleted = segs[idx]?.status === 'completed' || segs[idx]?.status === 'delayed';
      const isCurrent   = idx === ship.currentEdgeIndex;
      const color  = isCompleted ? '#10b981' : isCurrent ? '#38bdf8' : '#94a3b8';
      const dash   = isCompleted ? null : isCurrent ? null : '5, 8';
      const weight = isCurrent ? 4 : 2.5;
      const opacity= isCompleted ? 0.5 : 1.0;

      // geometry is [lng,lat] pairs → convert to [lat,lng] for Leaflet
      const latlngs = edge.geometry.map(c => [c[1], c[0]]);
      const line = L.polyline(latlngs, { color, weight, opacity, dashArray: dash });
      layers.push(line);
    });

    // Port markers along the path
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    // Port markers along the path
    ship.pathNodes.forEach((nodeId, idx) => {
      const node = graph?.getNode(nodeId);
      if (!node || !node.lat) return;
      const isOrigin = idx === 0;
      const isDest   = idx === ship.pathNodes.length - 1;
      const color    = isOrigin ? '#3ecf8e' : isDest ? '#ff5d5d' : '#f5a524'; // Supabase colors
      const r        = isOrigin || isDest ? 6 : 4;
      const dot = L.circleMarker([node.lat, node.lng], {
        radius: r, color, fillColor: color, fillOpacity: 0.9, weight: 1,
        className: 'glowing-port-marker'
      });
      dot.bindTooltip(`<b>${node.name}</b>`, { direction: 'top', offset: [0, -6] });
      layers.push(dot);
    });

    this.shipRouteLayer = L.layerGroup(layers).addTo(this.map);
    layers.forEach(l => { if (l.bringToFront) l.bringToFront(); });

    // Info popup at ship's current position
    if (!ship.currentLatLng) return;
    const cargo   = ship.cargoLabel || 'General';
    const prio    = '★'.repeat(ship.priority || 3) + '☆'.repeat(5 - (ship.priority || 3));
    const elapsed = ship.totalTimeSpent?.toFixed(1) || '0.0';
    const delay   = ship.totalPredictedDelay > 0.1 ? `<span style="color:#f43f5e;">+${ship.totalPredictedDelay.toFixed(1)}d delay</span>` : '<span style="color:#10b981;">on schedule</span>';
    const statusLabel = ship.status.toUpperCase().replace('_',' ');
    const rerouteInfo = ship.rerouteCount > 0 ? `🔁 Rerouted ${ship.rerouteCount}×` : '';
    const waitInfo  = ship.waitDaysRemaining > 0 ? `<br>⛳ Boarding in <b>${ship.waitDaysRemaining.toFixed(1)}d</b>` : '';

    // Build hop chain string
    const hopChain = ship.pathNodes
      .map((id, i) => {
        const n    = graph?.getNode(id);
        const name = n?.name || id;
        const seg  = segs[i - 1];
        const mark = i === 0 ? '🟣' : i === ship.pathNodes.length - 1 ? '🔴' : '🟡';
        return `${mark} ${name}`;
      }).join(' → ');

    const popupHtml = `
      <div style="font-family:'Inter',sans-serif; min-width:220px; padding:2px;">
        <div style="font-size:16px; margin-bottom:4px;">${ship.cargoEmoji || '🚢'} <b>${cargo}</b> <span style="font-size:11px; color:#fbbf24;">${prio}</span></div>
        <div style="font-size:11px; color:#475569; margin-bottom:6px;">ID: ${ship.id.split('-').slice(-1)[0]} · ${statusLabel}</div>
        <div style="font-size:11px; margin-bottom:5px; line-height:1.6;">${hopChain}</div>
        <hr style="border-color:rgba(0,0,0,0.1); margin:5px 0;">
        <div style="font-size:11px;">⏱️ <b>${elapsed}d</b> elapsed · ${delay}</div>
        ${waitInfo ? `<div style="font-size:11px;">${waitInfo}</div>` : ''}
        ${rerouteInfo ? `<div style="font-size:11px;">${rerouteInfo}</div>` : ''}
      </div>`;

    this.shipPopup = L.popup({ closeButton: true, maxWidth: 300, className: 'ship-route-popup' })
      .setLatLng(ship.currentLatLng)
      .setContent(popupHtml)
      .openOn(this.map);
  }

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

  highlightWeakPoints(weakPointNodes) {
    // Reset all nodes first
    this.nodeLayers.forEach((marker, id) => {
      marker.setStyle({ fillColor: 'rgba(255, 255, 255, 0.25)', color: 'transparent', weight: 0 });
      marker.setRadius(Math.max(2.0, this.map.getZoom() * 1.2));
    });

    if (!weakPointNodes || weakPointNodes.length === 0) return;

    weakPointNodes.forEach(wp => {
       const marker = this.nodeLayers.get(wp.nodeId);
       if (marker) {
          // Pulse severe red for weak point
          marker.setStyle({ fillColor: '#ef4444', color: '#dc2626', radius: 8, weight: 3, fillOpacity: 1.0 });
          marker.bringToFront();
          
          if (!marker.getTooltip()) {
             marker.bindTooltip(`<b>Weak Point</b><br/>${wp.cause}`, { direction: 'top' });
          } else {
             marker.setTooltipContent(`<b>Weak Point</b><br/>${wp.cause}`);
          }
       }
    });
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

  // 60-FPS render hook called by ShipmentEngine
  renderShipments(shipments) {
     const activeIds = new Set();
     
     shipments.forEach(ship => {
        // Include port_wait ships — they sit at their origin port visibly
        const visible = ['moving','delayed','rerouting','waiting','port_wait'];
        if (!visible.includes(ship.status)) return;
        if (!ship.currentLatLng) return;

        activeIds.add(ship.id);

        let marker = this.shipmentLayers.get(ship.id);
        if (!marker) {
          const icon = L.divIcon({
            className: 'custom-ship-icon',
            html: `<div class="ship-dot" id="marker-${ship.id}"></div>`,
            iconSize: [12, 12]
          });
          marker = L.marker(ship.currentLatLng, { icon, zIndexOffset: 1000 }).addTo(this.map);

          // ── CLICK → show route ───────────────────────────────────────
          marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e); // stop map deselect firing
            if (this.selectedShipId === ship.id) {
              this.clearShipRouteHighlight();
            } else {
              this.showShipRoute(ship);
            }
          });

          this.shipmentLayers.set(ship.id, marker);
        } else {
          marker.setLatLng(ship.currentLatLng);

          // Update route popup position if this ship is selected
          if (this.selectedShipId === ship.id && this.shipPopup) {
            this.shipPopup.setLatLng(ship.currentLatLng);
          }

          const domElement = document.getElementById(`marker-${ship.id}`);
          if (domElement) {
             let activeColor = '#4ea1ff'; // Info (Moving)
             
             if      (ship.status === 'port_wait')        activeColor = '#4ea1ff'; // Info
             else if (ship.status === 'rerouting')        activeColor = '#ff5d5d'; // Danger
             else if (ship.status === 'waiting')          activeColor = '#f5a524'; // Warning
             else if (ship._isEvadingVisually)            activeColor = '#d946ef'; // Magenta
             else if (ship.currentHealthDegradation && ship.currentHealthDegradation > 115)
                                                          activeColor = '#f5a524'; // Warning

             if (domElement.style.backgroundColor !== activeColor) {
               domElement.style.backgroundColor = activeColor;
               domElement.style.boxShadow = `0 0 10px ${activeColor}, 0 0 20px ${activeColor}88`;
             }

             // Pulse the selected ship slightly larger
             const isSelected = this.selectedShipId === ship.id;
             domElement.style.transform = isSelected ? 'scale(1.8)' : '';
          }
        }
     });

     // Sweep dead shipments
     for (const [id, marker] of this.shipmentLayers.entries()) {
        if (!activeIds.has(id)) {
           this.map.removeLayer(marker);
           this.shipmentLayers.delete(id);
           if (this.selectedShipId === id) this.clearShipRouteHighlight();
        }
     }
  }
}
