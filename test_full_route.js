import searoute from 'searoute-js';
const res = searoute([72.95, 18.95], [103.8, 1.25]); // INNSA to SGSIN
if (res && res.features && res.features.length > 0) {
    console.log("Success! Points:", res.features[0].geometry.coordinates.length);
} else {
    console.log("Failed full route");
}
