import { PORTS } from '../data/network.js';

export class DashboardPanel {
  constructor(liveAgent) {
    this.liveAgent = liveAgent;
    this.container = document.createElement('div');
    this.container.className = 'dashboard-panel';
    document.body.appendChild(this.container);

    this.currentMode = 'sandbox'; // 'sandbox' or 'irl'

    this.liveAgent.setLogCallback((msg) => this.appendTerminalLog(msg));

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="dashboard-header">
        <div class="mode-tabs">
          <button class="tab-btn ${this.currentMode === 'sandbox' ? 'active' : ''}" data-mode="sandbox">🧪 Sandbox</button>
          <button class="tab-btn ${this.currentMode === 'irl' ? 'active' : ''}" data-mode="irl">🌍 IRL Mode</button>
        </div>
      </div>
      
      <div class="dashboard-content">
        ${this.currentMode === 'sandbox' ? this.getSandboxHTML() : this.getIRLHTML()}
      </div>
    `;

    // Bind tab events
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = (e) => {
        const mode = e.currentTarget.getAttribute('data-mode');
        if (this.currentMode !== mode) {
           this.setMode(mode);
        }
      };
    });

    if (this.currentMode === 'sandbox') {
       this.bindSandboxEvents();
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    
    if (mode === 'irl') {
       this.liveAgent.start();
    } else {
       this.liveAgent.stop();
       const sim = window.simulation;
       if (sim && sim.events) sim.events._recalculateAllWeights(); // Flush UI
    }

    this.render();
  }

  getSandboxHTML() {
    return `
      <div class="control-group">
        <p class="panel-desc">Manual deployment. Take control of the simulation environment.</p>
        <button id="btn-spawn" class="dashboard-btn">🚢 Spawn Random Shipment</button>
        <button id="btn-suez" class="dashboard-btn danger">🚨 Block Suez Canal</button>
        <button id="btn-storm" class="dashboard-btn warning">🌩️ Add China Sea Storm</button>
        <button id="btn-clear" class="dashboard-btn clear">♻️ Clear Geometries</button>
      </div>
    `;
  }

  getIRLHTML() {
    return `
      <div class="control-group">
        <p class="panel-desc">Auto-generating operational risks mimicking live geopolitical & weather feeds.</p>
        <div class="live-terminal" id="irl-terminal">
          <div class="terminal-line">[System] Awaiting Intelligence Relay...</div>
        </div>
      </div>
    `;
  }

  appendTerminalLog(msg) {
    if (this.currentMode !== 'irl') return;
    const terminal = document.getElementById('irl-terminal');
    if (!terminal) return;

    const line = document.createElement('div');
    line.className = 'terminal-line';
    
    // Quick color formatting for visual effect
    if (msg.includes('CRITICAL') || msg.includes('BLOCKED')) line.style.color = '#ef4444';
    else if (msg.includes('WARNING')) line.style.color = '#fbbf24';
    else if (msg.includes('RESOLVED')) line.style.color = '#10b981';

    line.innerText = msg;
    terminal.appendChild(line);

    // Auto scroll bottom
    terminal.scrollTop = terminal.scrollHeight;
  }

  bindSandboxEvents() {
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
          sim.events.injectGeometricEvent('suez_strike', {lat: 28.5, lng: 33.5}, 500000, 'blocked', 'Suez Stoppage');
       }
    };

    document.getElementById('btn-storm').onclick = () => {
       const sim = window.simulation;
       if (sim && sim.events) {
          // East Asia Storm
          sim.events.injectGeometricEvent('china_storm', {lat: 25.5, lng: 125.0}, 800000, 'warning', 'Typhoon Risk');
       }
    };

    document.getElementById('btn-clear').onclick = () => {
       const sim = window.simulation;
       if (sim && sim.events) {
          sim.events.clearEvent('suez_strike');
          sim.events.clearEvent('china_storm');
       }
    };
  }
}
