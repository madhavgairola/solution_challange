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
        
        <div class="targeted-spawn-box">
           <label>Source Port:</label>
           <select id="origin-select" class="dash-select">
              <option value="" disabled selected>-- Select Origin --</option>
              ${PORTS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
           </select>
           
           <label>Destination (Child Connections):</label>
           <select id="dest-select" class="dash-select" disabled>
              <option value="" disabled selected>-- Awaiting Origin --</option>
           </select>
           
           <button id="btn-spawn-target" class="dashboard-btn spawn-target">🎯 Spawn Targeted Route</button>
        </div>

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

    const originSelect = this.element.querySelector('#origin-select');
    const destSelect = this.element.querySelector('#dest-select');
    const btnSpawnTarget = this.element.querySelector('#btn-spawn-target');

    originSelect.addEventListener('change', (e) => {
       const originId = e.target.value;
       const sim = window.simulation;
       if (!sim || !sim.graph) return;

       // Grab all valid topological children (edges connecting outwards)
       const edges = sim.graph.getEdges(originId);
       
       destSelect.innerHTML = '<option value="" disabled selected>-- Select Child Destination --</option>';
       
       edges.forEach(edge => {
          const childPort = PORTS.find(p => p.id === edge.destination);
          if (childPort) {
             destSelect.innerHTML += `<option value="${childPort.id}">${childPort.name}</option>`;
          }
       });

       destSelect.disabled = false;
    });

    btnSpawnTarget.addEventListener('click', () => {
       const o = originSelect.value;
       const d = destSelect.value;
       if (!o || !d) {
          alert('Please select both Origin and Destination children to deploy a target.');
          return;
       }
       const sim = window.simulation;
       if (sim && sim.shipments) {
          sim.shipments.spawnShipment(o, d);
          console.log(`[Targeted Spawn] Ship manually deployed from ${o} to direct child ${d}`);
       }
    });

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
