import { PORTS } from '../data/network.js';

export class SandboxDashboard {
  constructor(container) {
    this.container = container;
    this.element = document.createElement('div');
    this.element.className = 'dashboard-content-layer';
    
    this.render();
    this.bindEvents();
  }

  mount() {
    this.container.appendChild(this.element);
  }

  unmount() {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  render() {
    this.element.innerHTML = `
      <div class="control-group">
        <h3 class="dash-title">🧪 Simulation Sandbox</h3>
        <p class="panel-desc">Manual execution environment. Total system override controls active.</p>
        <button id="btn-spawn" class="dashboard-btn">🚢 Spawn Random Shipment</button>
        <button id="btn-suez" class="dashboard-btn danger">🚨 Block Suez Canal</button>
        <button id="btn-storm" class="dashboard-btn warning">🌩️ Add China Sea Storm</button>
        <button id="btn-clear" class="dashboard-btn clear">♻️ Clear Geometries</button>
      </div>
    `;
  }

  bindEvents() {
    const handleSpawn = () => {
       const p1 = PORTS[Math.floor(Math.random() * PORTS.length)].id;
       let p2 = PORTS[Math.floor(Math.random() * PORTS.length)].id;
       while (p2 === p1) p2 = PORTS[Math.floor(Math.random() * PORTS.length)].id;
       const sim = window.simulation;
       if (sim && sim.shipments) sim.shipments.spawnShipment(p1, p2);
    };

    const handleSuez = () => {
       const sim = window.simulation;
       if (sim && sim.events) {
          sim.events.injectGeometricEvent('suez_strike', {lat: 28.5, lng: 33.5}, 500000, 'blocked', 'Suez Stoppage');
       }
    };

    const handleStorm = () => {
       const sim = window.simulation;
       if (sim && sim.events) {
          sim.events.injectGeometricEvent('china_storm', {lat: 25.5, lng: 125.0}, 800000, 'warning', 'Typhoon Risk');
       }
    };

    const handleClear = () => {
       const sim = window.simulation;
       if (sim && sim.events) {
          sim.events.clearEvent('suez_strike');
          sim.events.clearEvent('china_storm');
       }
    };

    this.element.querySelector('#btn-spawn').addEventListener('click', handleSpawn);
    this.element.querySelector('#btn-suez').addEventListener('click', handleSuez);
    this.element.querySelector('#btn-storm').addEventListener('click', handleStorm);
    this.element.querySelector('#btn-clear').addEventListener('click', handleClear);
  }
}
