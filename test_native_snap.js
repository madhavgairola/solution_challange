import searoute from 'searoute-js';

const CNSHG = [121.5, 31.2]; // Shanghai
const USLAX = [-118.25, 33.75]; // LAX
const VNSGN = [106.7, 10.75]; // Ho Chi Minh
const SGSIN = [103.85, 1.15]; // Singapore

let r1 = searoute(CNSHG, USLAX);
console.log("CNSHG -> USLAX:", r1 ? (r1.geometry ? r1.geometry.coordinates.length : 'no geometry') : 'failed');

let r2 = searoute(VNSGN, SGSIN);
console.log("VNSGN -> SGSIN:", r2 ? (r2.geometry ? r2.geometry.coordinates.length : 'no geometry') : 'failed');
