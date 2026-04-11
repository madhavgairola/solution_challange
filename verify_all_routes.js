import fs from 'fs';
import { Graph } from './src/engine/Graph.js';
import { PORTS, ROUTES } from './src/data/network.js';
import searoute from 'searoute-js';

const graph = new Graph();
PORTS.forEach(p => graph.addNode(p));
ROUTES.forEach(r => graph.addEdge(r));

let failedPaths = [];
let drawn = new Set();

ROUTES.forEach(edge => {
    const source = graph.getNode(edge.source);
    const dest = graph.getNode(edge.destination);

    if (!source || !dest) return;
    
    const pathId = `${edge.source}-${edge.destination}`;
    const reverseId = `${edge.destination}-${edge.source}`;
    if (drawn.has(pathId) || drawn.has(reverseId)) return;
    drawn.add(pathId);

    const origin = [source.ocean_lng || source.lng, source.ocean_lat || source.lat];
    const destination = [dest.ocean_lng || dest.lng, dest.ocean_lat || dest.lat];

    try {
        const rt = searoute(origin, destination);
        if (!rt || !rt.features || rt.features.length === 0) {
            failedPaths.push(`${source.id} -> ${dest.id} (Empty GeoJSON)`);
        }
    } catch (e) {
        failedPaths.push(`${source.name} -> ${dest.name} (Library Crash)`);
    }
});

console.log(`Failed Maritime Paths (${failedPaths.length}):`);
failedPaths.forEach(p => console.log(p));
