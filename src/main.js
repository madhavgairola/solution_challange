import './style.css';
import { Graph } from './engine/Graph';
import { RoutingEngine } from './engine/RoutingEngine';
import { EventEngine } from './engine/EventEngine';
import { ShipmentEngine } from './engine/ShipmentEngine';
import { PORTS, ROUTES } from './data/network';

import { MapRenderer } from './ui/MapRenderer';
import { PortSidebar } from './ui/PortSidebar';
import { EventPanel } from './ui/EventPanel';
import { RoutingPanel } from './ui/RoutingPanel';
import { SandboxPanel } from './ui/SandboxPanel';

document.querySelector('#app').innerHTML = `
  <div id="map-container" style="width: 100vw; height: 100vh;"></div>
`;

// Initialize the Graph Engine
const supplyChainGraph = new Graph();

// Initialize Map
const mapRenderer = new MapRenderer('map-container');

// Initialize Engines
const routingEngine = new RoutingEngine(supplyChainGraph);
const eventEngine = new EventEngine(supplyChainGraph, mapRenderer);
const shipmentEngine = new ShipmentEngine(routingEngine, mapRenderer);

// Mount globally for Sandbox Control overrides
window.simulation = {
  graph: supplyChainGraph,
  routing: routingEngine,
  events: eventEngine,
  shipments: shipmentEngine
};

// Load Nodes (Ports)
PORTS.forEach(port => supplyChainGraph.addNode(port));

// Load Edges (Routes)
ROUTES.forEach(route => supplyChainGraph.addEdge(route));

const allNodes = supplyChainGraph.getAllNodes();
const allEdges = supplyChainGraph.getAllEdges();

// UI overlays removed per request

mapRenderer.renderNodes(allNodes);
mapRenderer.renderEdges(allNodes, allEdges);

const sidebar = new PortSidebar(mapRenderer);
mapRenderer.sidebar = sidebar;

const sandbox = new SandboxPanel();

console.log('✅ Visualization Engine Hooked.');

// Bind main game loop
let lastTime = performance.now();
function gameLoop(currentTime) {
  const dt = currentTime - lastTime;
  lastTime = currentTime;
  
  shipmentEngine.update(dt);
  
  requestAnimationFrame(gameLoop);
}

// Ensure the map waits for initial drawing safely
setTimeout(() => {
  requestAnimationFrame(gameLoop);
  console.log('✅ 60FPS Simulation Physics Loop Running.');
}, 500);

// Engine initialization completes. Panels removed for fullscreen map viewing.
