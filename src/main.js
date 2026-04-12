import './style.css';
import { Graph } from './engine/Graph';
import { RoutingEngine } from './engine/RoutingEngine';
import { EventEngine } from './engine/EventEngine';
import { ScheduleEngine } from './engine/ScheduleEngine';
import { LiveIntelligenceAgent } from './engine/LiveIntelligenceAgent';
import { ShipmentEngine } from './engine/ShipmentEngine';
import { PORTS, ROUTES } from './data/network';

import { MapRenderer } from './ui/MapRenderer';
import { PortSidebar } from './ui/PortSidebar';
import { NavSidebar } from './ui/NavSidebar';
import { SandboxDashboard } from './ui/SandboxDashboard';
import { IRLDashboard } from './ui/IRLDashboard';
import { TelemetryPanel } from './ui/TelemetryPanel';

document.querySelector('#app').innerHTML = `
  <div id="map-container" style="width: 100vw; height: 100vh;"></div>
`;

// Initialize the Graph Engine
const supplyChainGraph = new Graph();

// Initialize Map
const mapRenderer = new MapRenderer('map-container');

// Initialize Engines
const routingEngine  = new RoutingEngine(supplyChainGraph);
const eventEngine    = new EventEngine(supplyChainGraph, mapRenderer);
const scheduleEngine = new ScheduleEngine();
const liveAgent      = new LiveIntelligenceAgent(eventEngine);
const shipmentEngine = new ShipmentEngine(routingEngine, mapRenderer);

// Mount globally for Simulator overrides
window.simulation = {
  graph:       supplyChainGraph,
  routing:     routingEngine,
  schedule:    scheduleEngine,
  events:      eventEngine,
  shipments:   shipmentEngine,
  intelligence: liveAgent
};

// Load Nodes (Ports)
PORTS.forEach(port => supplyChainGraph.addNode(port));

// Load Edges (Routes)
ROUTES.forEach(route => supplyChainGraph.addEdge(route));

// Build vessel departure schedules AFTER graph is populated
scheduleEngine.buildSchedules(supplyChainGraph.getAllEdges());
shipmentEngine.scheduleEngine = scheduleEngine;

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

// Initialize Global Telemetry Tracker
const telemetryPanel = new TelemetryPanel();
shipmentEngine.telemetryPanel = telemetryPanel;

console.log('✅ Visualization Engine Hooked.');

window.simulationSpeed = 1.0;
// Simulation clock: records the real epoch when the sim started.
// The HTML clock widget reads these to show simulation date/time.
window._simStartEpoch      = Date.now();
window.simulationElapsedDays = 0;

// Bind main game loop
let lastTime = performance.now();
function gameLoop(currentTime) {
  let dt = currentTime - lastTime;
  lastTime = currentTime;
  
  // Real-time speed modulation wrapper
  dt *= window.simulationSpeed || 1.0;
  
  shipmentEngine.update(dt);
  eventEngine.update(dt);
  
  // Advance the global simulation clock (dt is already speed-scaled)
  window.simulationElapsedDays += dt / 30000; // 30000 ms = 1 sim day
  
  requestAnimationFrame(gameLoop);
}

// Ensure the map waits for initial drawing safely
setTimeout(() => {
  requestAnimationFrame(gameLoop);
  console.log('✅ 60FPS Simulation Physics Loop Running.');
}, 500);

// Engine initialization completes. Panels removed for fullscreen map viewing.
