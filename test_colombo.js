import searoute from 'searoute-js';

// Nudged deeper out to sea to hit the main global shipping spline
const LKCMB_NUDGED = [79.0, 6.0]; 

const INNSA = [72.95, 18.95];
const INMAA = [80.30, 13.10]; 
const SGSIN = [103.80, 1.25]; 

try {
  let r1 = searoute(INNSA, LKCMB_NUDGED);
  console.log("Mumbai -> Colombo Nudged:", r1 && r1.geometry ? r1.geometry.coordinates.length : 'failed');
  let r2 = searoute(LKCMB_NUDGED, INMAA);
  console.log("Colombo Nudged -> Chennai:", r2 && r2.geometry ? r2.geometry.coordinates.length : 'failed');
  let r3 = searoute(LKCMB_NUDGED, SGSIN);
  console.log("Colombo Nudged -> Singapore:", r3 && r3.geometry ? r3.geometry.coordinates.length : 'failed');
} catch (e) {
  console.error("Error:", e.message);
}
