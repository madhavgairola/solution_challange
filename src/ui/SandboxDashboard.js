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

        <div class="targeted-spawn-box" style="margin-top: 10px;">
           <label>Simulation Clock Speed:</label>
           <input type="range" id="sim-speed-slider" min="0" max="5" step="0.1" value="1" style="width: 100%;">
           <div style="display: flex; justify-content: space-between; font-size: 10px; color:#94a3b8;">
             <span>Paused</span>
             <span id="speed-display">1.0x</span>
             <span>Max Warp</span>
           </div>
        </div>

        <button id="btn-spawn" class="dashboard-btn">🚢 Spawn Random Shipment</button>
        <button id="btn-suez" class="dashboard-btn danger">🚨 Block Suez Canal</button>
        <button id="btn-deploy-custom" class="dashboard-btn warning" style="border: 1px solid #f59e0b;">⚙️ Deploy Custom Anomaly</button>
        <button id="btn-clear" class="dashboard-btn clear">♻️ Clear All Geometries</button>
      </div>
    `;

    // Ensure the modal directly anchors to the viewport ignoring Sidebar CSS constraints
    if (!document.getElementById('anomaly-config-modal')) {
      const modalHTML = `
        <div id="anomaly-config-modal" class="anomaly-modal" style="display: none;">
           <h4>Deploy Atmospheric Anomaly</h4>
           <p>Target Coordinates Acquired.</p>
           
           <label>Radius Influence (km): <span id="radius-val">800</span></label>
           <input type="range" id="anomaly-radius" min="100" max="3000" step="50" value="800">
           
           <label>Severity Tier:</label>
           <select id="anomaly-severity" class="dash-select">
              <option value="mild">Mild (10% Delay / Tolerable)</option>
              <option value="warning" selected>Warning (25% Delay / Evade)</option>
              <option value="critical">Critical (50% Delay / Critical)</option>
              <option value="blocked">Impassable (Physical Blockade)</option>
           </select>
           
           <label>Temporal Expiry (Simulation Days): <span id="duration-val">5</span></label>
           <input type="range" id="anomaly-duration" min="1" max="60" step="1" value="5">
           
           <div style="display:flex; gap:10px; margin-top: 15px;">
              <button id="btn-cancel-anomaly" class="dashboard-btn clear" style="flex:1;">Cancel</button>
              <button id="btn-confirm-anomaly" class="dashboard-btn warning" style="flex:1;">Initiate</button>
           </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
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
       if (!sim || !sim.events) return;
       
       // Flag deployment mode
       window._isDeployingAnomaly = true;
       alert("Target Acquisition Mode Active: Click anywhere on the map to define epicenter.");
       
       const deployBtn = this.element.querySelector('#btn-deploy-custom');
       deployBtn.innerHTML = '🎯 Awaiting Coordinates...';
       deployBtn.style.animation = 'pulseWarning 1.5s infinite';
    };

    // Attach Map Click Listener safely (poll for mapRenderer)
    const mapClickListener = (e) => {
        if (!window._isDeployingAnomaly) return;
        
        // Grab pos
        window._pendingAnomalyCoords = e.latlng;
        window._isDeployingAnomaly = false;
        
        // Reset button
        const deployBtn = this.element.querySelector('#btn-deploy-custom');
        deployBtn.innerHTML = '⚙️ Deploy Custom Anomaly';
        deployBtn.style.animation = 'none';

        // Show configuration overlay mapped natively
        document.getElementById('anomaly-config-modal').style.display = 'block';
    };

    // Assuming we can grab the leaf map directly via class name or internal window ref
    if (window.simulation && window.simulation.shipments && window.simulation.shipments.mapRenderer) {
        window.simulation.shipments.mapRenderer.map.on('click', mapClickListener);
    } else {
        // Fallback polling if initialized early
        setTimeout(() => {
           if (window.simulation && window.simulation.shipments && window.simulation.shipments.mapRenderer) {
              window.simulation.shipments.mapRenderer.map.on('click', mapClickListener);
           }
        }, 1000);
    }

    const handleClear = () => {
       const sim = window.simulation;
       if (sim && sim.events) {
          sim.events.clearEvent('suez_strike');
          sim.events.clearEvent('china_storm');
       }
    };

    // Anomaly Configuration Binding natively on document limits
    const radiusInput = document.getElementById('anomaly-radius');
    const radiusVal = document.getElementById('radius-val');
    radiusInput.addEventListener('input', e => radiusVal.innerText = e.target.value);

    const durInput = document.getElementById('anomaly-duration');
    const durVal = document.getElementById('duration-val');
    durInput.addEventListener('input', e => durVal.innerText = e.target.value);

    document.getElementById('btn-cancel-anomaly').addEventListener('click', () => {
       document.getElementById('anomaly-config-modal').style.display = 'none';
       window._pendingAnomalyCoords = null;
    });

    document.getElementById('btn-confirm-anomaly').addEventListener('click', () => {
       const sim = window.simulation;
       if (sim && sim.events && window._pendingAnomalyCoords) {
          const rMs = parseInt(radiusInput.value) * 1000;
          const sev = document.getElementById('anomaly-severity').value;
          const days = parseInt(durInput.value);
          const name = `Anomaly_${Math.floor(Math.random()*1000)}`;
          
          sim.events.injectGeometricEvent(
              name.toLowerCase(), 
              window._pendingAnomalyCoords, 
              rMs, 
              sev, 
              `Custom ${sev.toUpperCase()} System`, 
              days
          );

          document.getElementById('anomaly-config-modal').style.display = 'none';
          window._pendingAnomalyCoords = null;
       }
    });

    // Speed Slider Binding
    const speedSlider = this.element.querySelector('#sim-speed-slider');
    const speedDisplay = this.element.querySelector('#speed-display');
    speedSlider.addEventListener('input', (e) => {
       window.simulationSpeed = parseFloat(e.target.value);
       speedDisplay.innerText = window.simulationSpeed.toFixed(1) + 'x';
    });

    this.element.querySelector('#btn-spawn').addEventListener('click', handleSpawn);
    this.element.querySelector('#btn-suez').addEventListener('click', handleSuez);
    this.element.querySelector('#btn-deploy-custom').addEventListener('click', handleStorm);
    this.element.querySelector('#btn-clear').addEventListener('click', handleClear);
  }
}
