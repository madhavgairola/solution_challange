import './style.css';
import { Graph } from './engine/Graph';
import { RoutingEngine } from './engine/RoutingEngine';
import { EventEngine } from './engine/EventEngine';
import { LiveIntelligenceAgent } from './engine/LiveIntelligenceAgent';
import { ShipmentEngine } from './engine/ShipmentEngine';
import { PORTS, ROUTES } from './data/network';

import { MapRenderer } from './ui/MapRenderer';
import { PortSidebar } from './ui/PortSidebar';
import { NavSidebar } from './ui/NavSidebar';
import { SandboxDashboard } from './ui/SandboxDashboard';
import { IRLDashboard } from './ui/IRLDashboard';

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
const liveAgent = new LiveIntelligenceAgent(eventEngine);
const shipmentEngine = new ShipmentEngine(routingEngine, mapRenderer);

// Mount globally for Simulator overrides
window.simulation = {
  graph: supplyChainGraph,
  routing: routingEngine,
  events: eventEngine,
  shipments: shipmentEngine,
  intelligence: liveAgent
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

// Initialize Left Nav Dashboard Router
const sandboxDashboard = new SandboxDashboard();
const irlDashboard = new IRLDashboard(null, liveAgent);
const navSidebar = new NavSidebar(sandboxDashboard, irlDashboard, mapRenderer);

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
