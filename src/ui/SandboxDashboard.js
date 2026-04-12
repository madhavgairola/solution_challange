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
        
        <div class="targeted-spawn-box" id="route-planner-box">
           <div style="font-size:11px; color:#3ecf8e; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">🗺️ Route Planner</div>
           
           <label>Origin Port:</label>
           <select id="origin-select" class="dash-select">
              <option value="" disabled selected>-- Select Origin --</option>
              ${PORTS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
           </select>

           <label style="margin-top:8px;">Destination Port:</label>
           <select id="dest-select" class="dash-select">
              <option value="" disabled selected>-- Select Destination --</option>
              ${PORTS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
           </select>

           <label style="margin-top:8px;">Cargo Type:</label>
           <select id="cargo-type-select" class="dash-select">
              <option value="">🎲 Random</option>
              <option value="general">📦 General Cargo</option>
              <option value="perishable">🥩 Perishable (Speed-first)</option>
              <option value="oil">🛢️ Oil / Hazmat (Risk-averse)</option>
              <option value="high_priority">⚡ High Priority (Urgent)</option>
           </select>

           <label style="margin-top:8px;">Priority Level:</label>
           <select id="priority-select" class="dash-select">
              <option value="">🎲 Random</option>
              <option value="1">1 — Economy (Cheapest)</option>
              <option value="2">2 — Standard</option>
              <option value="3">3 — Normal</option>
              <option value="4">4 — Expedited</option>
              <option value="5">5 — Critical (Fastest)</option>
           </select>

           <!-- Departure Time Scheduler -->
           <label style="margin-top:10px;">Departure Time:</label>
           <div style="font-size:10px; color:#475569; margin-bottom:5px;" id="sim-now-label">🕒 Sim clock: loading...</div>
           <div style="display:flex; gap:12px; margin-bottom:6px;">
             <label style="display:flex; align-items:center; gap:5px; font-size:11px; color:#cbd5e1; cursor:pointer;">
               <input type="radio" name="depart-mode" id="depart-now" value="now" checked> 🟢 Now
             </label>
             <label style="display:flex; align-items:center; gap:5px; font-size:11px; color:#cbd5e1; cursor:pointer;">
               <input type="radio" name="depart-mode" id="depart-sched" value="scheduled"> ⏱️ Schedule
             </label>
           </div>
           <div id="depart-config" style="display:none; background:rgba(0,0,0,0.25); border-radius:6px; padding:8px; margin-bottom:4px;">
             <div style="font-size:10px; color:#475569; margin-bottom:5px;">Depart in (sim time):</div>
             <div style="display:flex; align-items:center; gap:6px;">
               <input type="number" id="depart-sim-hours" min="0" max="999" value="6"
                 style="width:54px; background:#0f172a; border:1px solid rgba(255,255,255,0.1); color:#e2e8f0; border-radius:5px; padding:4px 6px; font-size:12px;">
               <span style="font-size:10px; color:#64748b;">sim hrs</span>
               <input type="number" id="depart-sim-mins" min="0" max="55" step="5" value="0"
                 style="width:44px; background:#0f172a; border:1px solid rgba(255,255,255,0.1); color:#e2e8f0; border-radius:5px; padding:4px 6px; font-size:12px;">
               <span style="font-size:10px; color:#64748b;">sim min</span>
             </div>
             <div style="font-size:10px; color:#3ecf8e; margin-top:5px;" id="depart-real-preview">≈ real time: —</div>
           </div>

           <button id="btn-calc-routes" class="dashboard-btn spawn-target" style="margin-top:6px;">
             🔍 Calculate Best Routes
           </button>

           <!-- Route results injected here dynamically -->
           <div id="route-results-panel" style="margin-top:8px;"></div>
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
        
        <div style="height:1px; background:rgba(255,255,255,0.1); margin:12px 0;"></div>
        <button id="btn-demo-cascade" class="dashboard-btn" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; border: none; font-weight: 700;">
           🎬 Run Cascade Scenario Demo
        </button>
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

    // ── Route Planner ─────────────────────────────────────────────────
    const originSelect  = this.element.querySelector('#origin-select');
    const destSelect    = this.element.querySelector('#dest-select');
    const calcBtn       = this.element.querySelector('#btn-calc-routes');
    const resultsPanel  = this.element.querySelector('#route-results-panel');

    // Filter destination options dynamically (exclude origin)
    originSelect.addEventListener('change', () => {
      const originId = originSelect.value;
      Array.from(destSelect.options).forEach(opt => {
        opt.disabled = (opt.value === originId);
      });
      if (destSelect.value === originId) destSelect.value = '';
    });

    // ── Departure scheduler UI ──────────────────────────────────────────
    const departNowEl   = this.element.querySelector('#depart-now');
    const departSchedEl = this.element.querySelector('#depart-sched');
    const departConfig  = this.element.querySelector('#depart-config');
    const simNowLabel   = this.element.querySelector('#sim-now-label');
    const realPreview   = this.element.querySelector('#depart-real-preview');
    const hoursInput    = this.element.querySelector('#depart-sim-hours');
    const minsInput     = this.element.querySelector('#depart-sim-mins');

    // Show/hide scheduler config panel
    const toggleDepartConfig = () => {
      departConfig.style.display = departSchedEl.checked ? 'block' : 'none';
    };
    departNowEl.addEventListener('change',   toggleDepartConfig);
    departSchedEl.addEventListener('change', toggleDepartConfig);

    // Helper: compute delay days from form inputs
    const getDepartDelayDays = () => {
      if (!departSchedEl || !departSchedEl.checked) return 0;
      const simHrs = parseFloat(hoursInput?.value) || 0;
      const simMin = parseFloat(minsInput?.value)  || 0;
      return (simHrs + simMin / 60) / 24;
    };

    // Live preview: how many real seconds until departure
    const updatePreview = () => {
      const delayDays = getDepartDelayDays();
      const realSecs  = delayDays * 30; // 1 sim day = 30 real seconds at 1x speed
      const speed     = window.simulationSpeed || 1;
      const actualSecs = realSecs / speed;
      if (actualSecs < 60) {
        realPreview.textContent = `≈ real time: ${actualSecs.toFixed(0)}s at ${speed}x speed`;
      } else {
        realPreview.textContent = `≈ real time: ${(actualSecs/60).toFixed(1)} min at ${speed}x speed`;
      }
    };
    hoursInput?.addEventListener('input', updatePreview);
    minsInput?.addEventListener('input',  updatePreview);
    updatePreview();

    // Live sim-clock label inside the form
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    setInterval(() => {
      const days = window.simulationElapsedDays || 0;
      const start = window._simStartEpoch || Date.now();
      const now   = new Date(start + days * 86400000);
      if (simNowLabel) {
        simNowLabel.textContent = `🕒 Now: ${now.getDate()} ${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      }
    }, 1000);

    calcBtn.addEventListener('click', () => {
      const o = originSelect.value;
      const d = destSelect.value;
      if (!o || !d) { resultsPanel.innerHTML = '<p style="color:#f43f5e; font-size:11px;">⚠️ Select both Origin and Destination first.</p>'; return; }
      if (o === d)  { resultsPanel.innerHTML = '<p style="color:#f43f5e; font-size:11px;">⚠️ Origin and Destination must differ.</p>'; return; }

      const sim = window.simulation;
      if (!sim || !sim.routing) { resultsPanel.innerHTML = '<p style="color:#f43f5e; font-size:11px;">⚠️ Routing engine not ready.</p>'; return; }

      // Get cargo-aware weights
      const cargoTypeVal  = this.element.querySelector('#cargo-type-select').value;
      const priorityVal   = parseInt(this.element.querySelector('#priority-select').value) || 3;
      const CARGO_WEIGHTS = {
        general:       { w_time: 0.4, w_cost: 0.4, w_risk: 0.2 },
        perishable:    { w_time: 0.8, w_cost: 0.1, w_risk: 0.1 },
        oil:           { w_time: 0.2, w_cost: 0.3, w_risk: 0.5 },
        high_priority: { w_time: 0.7, w_cost: 0.1, w_risk: 0.2 }
      };
      const baseWeights = CARGO_WEIGHTS[cargoTypeVal] || { w_time: 0.5, w_cost: 0.3, w_risk: 0.2 };
      const pBias = 0.07 * (priorityVal - 3);
      const weights = {
        w_time: Math.max(0.05, baseWeights.w_time + pBias),
        w_cost: Math.max(0.05, baseWeights.w_cost - pBias * 0.5),
        w_risk: baseWeights.w_risk
      };

      resultsPanel.innerHTML = '<p style="color:#94a3b8; font-size:11px;">⏳ Computing routes...</p>';

      // Run Yen\'s K-Shortest Paths (up to 3)
      setTimeout(() => {
        const routes = sim.routing.getKShortestPaths(o, d, weights, 3);
        if (!routes || routes.length === 0) {
          resultsPanel.innerHTML = '<p style="color:#f43f5e; font-size:11px;">❌ No viable routes found between these ports.</p>';
          return;
        }

        const ROUTE_LABELS = ['🥇 Optimal', '🥈 Alternative', '🥉 Alternate 2'];
        const ROUTE_COLORS = ['#3ecf8e', '#fbbf24', '#fb923c'];

        resultsPanel.innerHTML = routes.map((route, idx) => {
          const hopChain = route.path.map(id => PORTS.find(p => p.id === id)?.name || id).join(' → ');
          const totalDays = route.totalTime.toFixed(1);
          const totalCost = route.totalCost ? Math.round(route.totalCost) : '—';
          const totalRisk = route.totalRisk ? route.totalRisk.toFixed(2) : '—';
          const hops = route.path.length - 1;
          const color = ROUTE_COLORS[idx] || '#94a3b8';
          const label = ROUTE_LABELS[idx] || `Route ${idx + 1}`;

          return `
            <div class="route-option-card" style="border-left: 3px solid ${color}; background: rgba(15,23,42,0.8); border-radius:6px; padding:10px; margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:${color}; font-size:11px; font-weight:700;">${label}</span>
                <span style="color:#64748b; font-size:10px;">${hops} hop${hops !== 1 ? 's' : ''}</span>
              </div>
              <div style="font-size:10px; color:#cbd5e1; margin:5px 0; line-height:1.5;">${hopChain}</div>
              <div style="display:flex; gap:10px; font-size:10px; color:#94a3b8; margin-bottom:8px;">
                <span>⏱️ ${totalDays}d</span>
                <span>💰 $${totalCost}</span>
                <span>⚠️ Risk ${totalRisk}</span>
              </div>
              <button class="dashboard-btn" data-route-idx="${idx}" 
                style="width:100%; padding:5px; font-size:11px; background: rgba(${idx===0?'62,207,142':'251,191,36'},0.1); border-color:${color}; color:${color};">
                🚀 Deploy This Route
              </button>
            </div>`;
        }).join('');

        // Store routes for deploy handlers
        window._calculatedRoutes = routes;
        window._routeDeployOrigin = o;
        window._routeDeployDest   = d;

        // Bind deploy buttons
        resultsPanel.querySelectorAll('[data-route-idx]').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx         = parseInt(btn.dataset.routeIdx);
            const chosenRoute = window._calculatedRoutes[idx];
            const sim2        = window.simulation;
            if (!sim2 || !sim2.shipments || !chosenRoute) return;

            const cargoType  = this.element.querySelector('#cargo-type-select').value;
            const priority   = parseInt(this.element.querySelector('#priority-select').value) || 0;
            const delayDays  = getDepartDelayDays(); // 0 if "Now" is selected

            const opts = {};
            if (cargoType)    opts.cargoType            = cargoType;
            if (priority)     opts.priority             = priority;
            if (delayDays > 0) opts.scheduledDepartureDay = delayDays;

            sim2.shipments.spawnShipmentWithRoute(
              window._routeDeployOrigin,
              window._routeDeployDest,
              chosenRoute,
              opts
            );

            // Visual feedback
            const depLabel = delayDays > 0
              ? `⏳ Scheduled +${(delayDays*24).toFixed(1)}h`
              : '✅ Deployed!';
            btn.innerHTML   = depLabel;
            btn.style.color = delayDays > 0 ? '#a855f7' : '#10b981';
            btn.disabled    = true;
            setTimeout(() => { btn.innerHTML = '🚀 Deploy This Route'; btn.style.color = ''; btn.disabled = false; }, 2500);
          });
        });

      }, 50);
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
    
    const handleDemoCascade = () => {
       const sim = window.simulation;
       if (!sim || !sim.shipments || !sim.events) return;
       
       const btn = this.element.querySelector('#btn-demo-cascade');
       if (!btn) return;
       const origText = btn.innerHTML;
       btn.innerHTML = '⚙️ Initializing Scenario...';
       btn.disabled = true;

       // 1. Clear any existing events
       handleClear();

       // 2. Spawn payload ships traversing through Suez bottleneck
       sim.shipments.spawnShipment('singapore', 'rotterdam', { priority: 2, scheduledDepartureDay: 0 }); 
       sim.shipments.spawnShipment('mumbai',    'hamburg',   { priority: 4, scheduledDepartureDay: 0.1 });
       sim.shipments.spawnShipment('colombo',   'newyork',   { priority: 3, scheduledDepartureDay: 0.2 });
       sim.shipments.spawnShipment('dubai',     'piraeus',   { priority: 5, scheduledDepartureDay: 0.3 }); // critical, will bypass immediately
       sim.shipments.spawnShipment('karachi',   'rotterdam', { priority: 2, scheduledDepartureDay: 0.4 });

       // Brief warp-speed to populate ships onto the map
       window.simulationSpeed = 4.0;
       if (speedSlider) speedSlider.value = 4.0;
       if (speedDisplay) speedDisplay.innerText = '4.0x';

       // 3. Fire blockade after ships are en-route
       setTimeout(() => {
          btn.innerHTML = '🚨 Striking Suez Canal...';
          sim.events.injectGeometricEvent('suez_strike', {lat: 28.5, lng: 33.5}, 500000, 'blocked', 'Suez Blockade');
          
          window.simulationSpeed = 1.0; 
          if (speedSlider) speedSlider.value = 1.0;
          if (speedDisplay) speedDisplay.innerText = '1.0x';
          
          setTimeout(() => {
             btn.innerHTML = origText;
             btn.disabled = false;
          }, 4000);
       }, 3000);
    };

    this.element.querySelector('#btn-spawn').addEventListener('click', handleSpawn);
    this.element.querySelector('#btn-suez').addEventListener('click', handleSuez);
    this.element.querySelector('#btn-deploy-custom').addEventListener('click', handleStorm);
    this.element.querySelector('#btn-clear').addEventListener('click', handleClear);
    this.element.querySelector('#btn-demo-cascade')?.addEventListener('click', handleDemoCascade);
  }
}
