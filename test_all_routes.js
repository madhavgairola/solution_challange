import { PORTS, ROUTES } from './src/data/network.js';
import searoute from 'searoute-js';

const nodeMap = new Map();
PORTS.forEach(p => nodeMap.set(p.id, p));

const seen = new Set();
ROUTES.forEach(edge => {
  const s = nodeMap.get(edge.source);
  const d = nodeMap.get(edge.destination);
  
  if (!s || !d) return;

  const id1 = s.id + '-' + d.id;
  const id2 = d.id + '-' + s.id;
  if(seen.has(id1) || seen.has(id2)) return;
  seen.add(id1);

  try {
     let r = searoute([s.lng, s.lat], [d.lng, d.lat]);
     if (!r || !r.geometry) {
       console.log(`FAILED: ${s.name} (${s.id}) -> ${d.name} (${d.id})`);
     } else {
       console.log(`OK: ${s.id} -> ${d.id}`);
     }
  } catch(e) {
     console.log(`FAILED (Exception): ${s.id} -> ${d.id}`);
  }
});
