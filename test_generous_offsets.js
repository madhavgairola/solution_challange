import searoute from 'searoute-js';

const res = searoute([71.0, 18.0], [54.0, 16.95]);
if (res && res.features && res.features.length > 0) {
    console.log("Success! Points:", res.features[0].geometry.coordinates.length);
} else {
    console.log("Failed even in open ocean");
}
