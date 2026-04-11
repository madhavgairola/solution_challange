import fs from 'fs';
import { RoutingEngine } from './src/engine/RoutingEngine.js';
import { Graph } from './src/engine/Graph.js';
import { PORTS, ROUTES } from './src/data/network.js';
// Add searoute to test if it yields empty geometry
import searoute from 'searoute-js';

const graph = new Graph();
PORTS.forEach(p => graph.addNode(p));
ROUTES.forEach(r => graph.addEdge(r));

const routing = new RoutingEngine(graph);
const weights = { w_time: 1, w_cost: 1, w_risk: 1 };
const routes = routing.getKShortestPaths('INNSA', 'SGSIN', weights, 3);

const innsa = graph.getNode('AEDXB');
const lkcmb = graph.getNode('SGSIN');
const origin = [innsa.ocean_lng || innsa.lng, innsa.ocean_lat || innsa.lat];
const destination = [lkcmb.ocean_lng || lkcmb.lng, lkcmb.ocean_lat || lkcmb.lat];
console.log("Origin:", origin, "Dest:", destination);

const rt = searoute(origin, destination);
if (rt && rt.features && rt.features.length > 0) {
   console.log("Searoute SUCCESS, length:", rt.features[0].geometry.coordinates.length);
} else {
   console.log("Searoute FAILED (returned empty geojson)");
}

