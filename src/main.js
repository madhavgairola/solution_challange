import './style.css';
import { Graph } from './engine/Graph';
import { RoutingEngine } from './engine/RoutingEngine';
import { EventEngine } from './engine/EventEngine';
import { PORTS, ROUTES } from './data/network';

import { MapRenderer } from './ui/MapRenderer';
import { PortSidebar } from './ui/PortSidebar';
import { EventPanel } from './ui/EventPanel';
import { RoutingPanel } from './ui/RoutingPanel';

document.querySelector('#app').innerHTML = `
  <div id="map-container" style="width: 100vw; height: 100vh;"></div>
`;

// Initialize the Graph Engine
const supplyChainGraph = new Graph();

// Load Nodes (Ports)
PORTS.forEach(port => supplyChainGraph.addNode(port));

// Load Edges (Routes)
ROUTES.forEach(route => supplyChainGraph.addEdge(route));

const allNodes = supplyChainGraph.getAllNodes();
const allEdges = supplyChainGraph.getAllEdges();

// UI overlays removed per request

// Initialize Map
const mapRenderer = new MapRenderer('map-container');
mapRenderer.renderNodes(allNodes);
mapRenderer.renderEdges(allNodes, allEdges);

const sidebar = new PortSidebar(mapRenderer);
mapRenderer.sidebar = sidebar;

console.log('✅ Visualization Engine Hooked.');

// Engine initialization completes. Panels removed for fullscreen map viewing.
