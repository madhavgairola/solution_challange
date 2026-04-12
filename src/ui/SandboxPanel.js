import { PORTS } from '../data/network.js';

export class SandboxPanel {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'sandbox-panel';
    document.body.appendChild(this.container);

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="sandbox-header">
        <h3>Sandbox Controls</h3>
        <span>Simulation Tools</span>
      </div>
      <div class="sandbox-content">
        <button id="btn-spawn" class="sandbox-btn">🚢 Spawn Random Shipment</button>
        <button id="btn-suez" class="sandbox-btn danger">🚨 Block Suez Canal</button>
        <button id="btn-clear" class="sandbox-btn clear">♻️ Clear All Events</button>
      </div>
    `;

    document.getElementById('btn-spawn').onclick = () => {
       const p1 = PORTS[Math.floor(Math.random() * PORTS.length)].id;
       let p2 = PORTS[Math.floor(Math.random() * PORTS.length)].id;
       while (p2 === p1) p2 = PORTS[Math.floor(Math.random() * PORTS.length)].id;
       
       const sim = window.simulation;
       if (sim && sim.shipments) {
          const ship = sim.shipments.spawnShipment(p1, p2);
          if (ship) console.log(`[Spawned] Ship from ${p1} to ${p2}`);
       }
    };

    document.getElementById('btn-suez').onclick = () => {
       const sim = window.simulation;
       if (sim && sim.events) {
          // Geometry roughly over Port Said / Red Sea entry
          sim.events.injectGeometricEvent('suez_strike', {lat: 28.5, lng: 33.5}, 500000, 'blocked', 'Suez Stoppage');
       }
    };

    document.getElementById('btn-clear').onclick = () => {
       const sim = window.simulation;
       if (sim && sim.events) {
          sim.events.clearEvent('suez_strike');
       }
    };
  }
}
