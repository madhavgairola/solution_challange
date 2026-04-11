import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['searoute-js', 'geojson-path-finder', 'tinyqueue']
  },
  build: {
    commonjsOptions: {
      include: [/searoute-js/, /geojson-path-finder/, /tinyqueue/, /node_modules/]
    }
  }
});
