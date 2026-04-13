import './style.css';
import { Graph } from './engine/Graph';
import { RoutingEngine } from './engine/RoutingEngine';
import { EventEngine } from './engine/EventEngine';
import { ScheduleEngine } from './engine/ScheduleEngine';
import { LiveIntelligenceAgent } from './engine/LiveIntelligenceAgent';
import { ShipmentEngine } from './engine/ShipmentEngine';
import { AlertEngine } from './engine/AlertEngine';
import { RouteAnalyzer } from './engine/RouteAnalyzer';
import { PORTS, ROUTES } from './data/network';

import { MapRenderer } from './ui/MapRenderer';
import { PortSidebar } from './ui/PortSidebar';
import { NavSidebar } from './ui/NavSidebar';
import { SandboxDashboard } from './ui/SandboxDashboard';
import { IRLDashboard } from './ui/IRLDashboard';
import { TelemetryPanel } from './ui/TelemetryPanel';
import { AlertPanel } from './ui/AlertPanel';
import { KPIBar } from './ui/KPIBar';

document.querySelector('#app').innerHTML = `
  <div id="map-container" style="width: 100vw; height: 100vh;"></div>
`;

// Initialize the Graph Engine
const supplyChainGraph = new Graph();

// Initialize Map
const mapRenderer = new MapRenderer('map-container');

// Initialize Engines
const alertEngine   = new AlertEngine();
const routingEngine  = new RoutingEngine(supplyChainGraph);
const eventEngine    = new EventEngine(supplyChainGraph, mapRenderer);
const scheduleEngine = new ScheduleEngine();
const liveAgent      = new LiveIntelligenceAgent(eventEngine);
const shipmentEngine = new ShipmentEngine(routingEngine, mapRenderer);
const routeAnalyzer  = new RouteAnalyzer(routingEngine, eventEngine);
shipmentEngine.alertEngine = alertEngine;

// Mount globally for Simulator overrides
window.simulation = {
  graph:        supplyChainGraph,
  routing:      routingEngine,
  schedule:     scheduleEngine,
  events:       eventEngine,
  shipments:    shipmentEngine,
  intelligence: liveAgent,
  alerts:       alertEngine,
  analyzer:     routeAnalyzer,
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

mapRenderer.renderNodes(allNodes);
mapRenderer.renderEdges(allNodes, allEdges);

// ── Left Panel: Global Topologies (always visible) ──────────────────
const sidebar = new PortSidebar(mapRenderer);
mapRenderer.sidebar = sidebar;

// ── Dashboards ──────────────────────────────────────────────────────
const sandboxDashboard = new SandboxDashboard();
const irlDashboard = new IRLDashboard(null, liveAgent);

// ── NavSidebar: orchestrator (Home overlay + Right panel) ───────────
const navSidebar = new NavSidebar(sandboxDashboard, irlDashboard, mapRenderer);

// Inject home button into the left PortSidebar
navSidebar.injectHomeButton(sidebar);

// ── Fleet Telemetry: mounted inside right panel ─────────────────────
const telemetryPanel = new TelemetryPanel();
shipmentEngine.telemetryPanel = telemetryPanel;
window.simulation.telemetry = telemetryPanel;

// Mount telemetry into the right panel's telemetry slot
const telemetryMount = document.getElementById('telemetry-mount');
if (telemetryMount) {
  telemetryPanel.mountInto(telemetryMount);
}

console.log('Visualization Engine Hooked.');

// ── Intelligence Feed (bottom center) ───────────────────────────────
const alertPanel = new AlertPanel(alertEngine);
const kpiBar     = new KPIBar(alertEngine);

// ── Patch EventEngine to fire alerts on disruption injection ─────────
const _origGeo = eventEngine.injectGeometricEvent?.bind(eventEngine);
if (_origGeo) {
  eventEngine.injectGeometricEvent = (ruleKey, pos, radius, severity, name) => {
    const result = _origGeo(ruleKey, pos, radius, severity, name);
    const label  = name || ruleKey;
    const sev    = severity === 'blocked' ? 'critical' : severity === 'critical' ? 'critical' : 'warning';
    alertEngine.emit(
      'blockage', sev,
      `${label} detected — ${sev === 'critical' ? 'route blocked' : 'degraded conditions'}`,
      { lat: pos.lat, lng: pos.lng, severity },
      `geo-${ruleKey}`
    );
    return result;
  };
}
const _origEvt = eventEngine.injectEvent?.bind(eventEngine);
if (_origEvt) {
  eventEngine.injectEvent = (key, ...args) => {
    const result = _origEvt(key, ...args);
    alertEngine.emit(
      'blockage', 'critical',
      `${key.replace(/_/g,' ')} — route corridor blocked`,
      {},
      `evt-${key}`
    );
    return result;
  };
}

window.simulationSpeed = 1.0;
window._simStartEpoch      = Date.now();
window.simulationElapsedDays = 0;

// Bind main game loop
let lastTime = performance.now();
function gameLoop(currentTime) {
  let dt = currentTime - lastTime;
  lastTime = currentTime;
  
  dt *= window.simulationSpeed || 1.0;
  
  shipmentEngine.update(dt);
  eventEngine.update(dt);
  
  window.simulationElapsedDays += dt / 30000;
  
  requestAnimationFrame(gameLoop);
}

setTimeout(() => {
  requestAnimationFrame(gameLoop);
  console.log('60FPS Simulation Physics Loop Running.');
}, 500);
