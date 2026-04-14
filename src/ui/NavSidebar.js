import { ScheduleBoard } from './ScheduleBoard.js';

/**
 * NavSidebar — Application-level orchestrator.
 *
 * UX Model:
 *   - HOME: centered overlay with two choices (Sandbox / Live Intelligence)
 *     + live demo activity on the map (ships, anomalies, route highlights)
 *   - Choosing one enters that MODE. Mode persists until Home is pressed.
 *   - Right panel is a TOOL DRAWER — open/close freely without losing mode.
 *   - Schedule Board is a tab INSIDE each dashboard.
 *   - Floating Home button always accessible (bottom-left corner).
 */
export class NavSidebar {
  constructor(sandboxView, irlView, mapRenderer) {
    this.sandboxView   = sandboxView;
    this.irlView       = irlView;
    this.mapRenderer   = mapRenderer;
    this.scheduleBoard = new ScheduleBoard(null);

    this.currentView   = null;
    this.currentMode   = null;
    this.activeTab     = null;
    this._demoRunning  = false;

    this._buildHomeOverlay();
    this._buildMapOverlay();
    this._buildRightPanel();
    this._buildRightPanelToggle();
    this._buildFloatingHomeBtn();

    // Boot into Home with demo
    this.goHome();
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  HOME OVERLAY                                                       */
  /* ──────────────────────────────────────────────────────────────────── */
  _buildHomeOverlay() {
    this.homeOverlay = document.createElement('div');
    this.homeOverlay.id = 'home-overlay';
    this.homeOverlay.innerHTML = `
      <div class="home-hero">
        <div class="home-brand">
          <div class="home-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div>
            <div class="home-brand-name">Deep Spec</div>
            <div class="home-brand-tag">Maritime Intelligence System</div>
          </div>
        </div>
        <div class="home-card-container">
          <div class="home-card" data-target="sandbox">
            <div class="home-card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div class="home-card-title">Simulation Sandbox</div>
            <div class="home-card-desc">Route planning, disruption injection, and fleet deployment</div>
            <div class="home-card-cta">Enter Sandbox →</div>
          </div>
          <div class="home-card" data-target="irl">
            <div class="home-card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </div>
            <div class="home-card-title">Live Intelligence</div>
            <div class="home-card-desc">Real-time geopolitical risk mapping and operational analysis</div>
            <div class="home-card-cta">Go Live →</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.homeOverlay);

    // Remove Leaflet attribution
    setTimeout(() => {
      const attr = document.querySelector('.leaflet-control-attribution');
      if (attr) attr.style.display = 'none';
    }, 500);

    this.homeOverlay.querySelectorAll('.home-card').forEach(card => {
      card.addEventListener('click', () => {
        this.enterMode(card.dataset.target);
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  MAP OVERLAY — translucent layer over the map for home screen       */
  /* ──────────────────────────────────────────────────────────────────── */
  _buildMapOverlay() {
    this.mapOverlay = document.createElement('div');
    this.mapOverlay.id = 'home-map-overlay';
    document.body.appendChild(this.mapOverlay);
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  FLOATING HOME BUTTON — always accessible                           */
  /* ──────────────────────────────────────────────────────────────────── */
  _buildFloatingHomeBtn() {
    this.floatingHome = document.createElement('div');
    this.floatingHome.className = 'floating-home-btn';
    this.floatingHome.title = 'Return Home';
    this.floatingHome.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    `;
    this.floatingHome.style.display = 'none'; // hidden on home screen
    this.floatingHome.addEventListener('click', () => this.goHome());
    document.body.appendChild(this.floatingHome);
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  RIGHT PANEL — tool drawer                                          */
  /* ──────────────────────────────────────────────────────────────────── */
  _buildRightPanel() {
    this.rightPanel = document.createElement('div');
    this.rightPanel.id = 'right-panel';
    this.rightPanel.className = 'right-panel';
    this.rightPanel.innerHTML = `
      <div class="right-panel-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="right-panel-title" id="right-panel-title">Dashboard</div>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <div class="right-panel-tab" id="tab-main" data-tab="main">Controls</div>
          <div class="right-panel-tab" id="tab-schedule" data-tab="schedule">Schedule</div>
          <div class="right-panel-close" id="right-panel-close" title="Close panel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        </div>
      </div>
      <div class="right-panel-body" id="right-panel-body">
        <div id="dashboard-mount-point" class="dashboard-mount"></div>
      </div>
      <div class="right-panel-telemetry" id="right-panel-telemetry">
        <div class="telemetry-toggle" id="telemetry-section-toggle">
          <span class="telemetry-toggle-label">FLEET TELEMETRY</span>
          <span class="telemetry-toggle-arrow" id="telemetry-arrow">▼</span>
        </div>
        <div class="telemetry-content" id="telemetry-mount"></div>
      </div>
    `;
    document.body.appendChild(this.rightPanel);

    this.rightPanel.querySelector('#right-panel-close').addEventListener('click', () => {
      this.closeDrawer();
    });

    this.rightPanel.querySelectorAll('.right-panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    this.rightPanel.querySelector('#telemetry-section-toggle').addEventListener('click', () => {
      const content = this.rightPanel.querySelector('#telemetry-mount');
      const arrow   = this.rightPanel.querySelector('#telemetry-arrow');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.textContent = '▼';
      } else {
        content.style.display = 'none';
        arrow.textContent = '▶';
      }
    });
  }

  _buildRightPanelToggle() {
    this.drawerToggle = document.createElement('div');
    this.drawerToggle.id = 'drawer-toggle';
    this.drawerToggle.className = 'drawer-toggle-btn';
    this.drawerToggle.title = 'Open controls';
    this.drawerToggle.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    `;
    this.drawerToggle.style.display = 'none';
    document.body.appendChild(this.drawerToggle);

    this.drawerToggle.addEventListener('click', () => {
      this.openDrawer();
    });
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  Also inject Home button into PortSidebar (for consistency)         */
  /* ──────────────────────────────────────────────────────────────────── */
  injectHomeButton(portSidebar) {
    this.portSidebar = portSidebar;
    const homeBtn = document.createElement('div');
    homeBtn.className = 'port-sidebar-home-btn';
    homeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      <span>Home</span>
    `;
    homeBtn.addEventListener('click', () => this.goHome());
    portSidebar.container.appendChild(homeBtn);
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  NAVIGATION LOGIC                                                   */
  /* ──────────────────────────────────────────────────────────────────── */

  enterMode(mode) {
    this._stopDemo();
    this.homeOverlay.style.display = 'none';
    this.mapOverlay.style.display = 'none';
    this.floatingHome.style.display = 'flex';
    this.currentMode = mode;

    // Show alerts, sidebar, and KPI bar in mode
    const alertEl = document.getElementById('alert-panel');
    if (alertEl) alertEl.style.display = '';
    if (this.portSidebar) this.portSidebar.wrapper.style.display = '';
    const kpiBar = document.getElementById('top-bar-container');
    if (kpiBar) kpiBar.style.display = '';

    // Reset map to world view
    if (this.mapRenderer && this.mapRenderer.map) {
      this.mapRenderer.map.setView([20, 40], 2, { animate: true, duration: 0.8 });
    }

    this._wipeSimulationClean();
    this.switchTab('main');
    this._updateTitle();
    this.openDrawer();
  }

  goHome() {
    this.closeDrawer();
    this.drawerToggle.style.display = 'none';
    this.floatingHome.style.display = 'none';

    if (this.currentView) {
      this.currentView.unmount();
      this.currentView = null;
    }

    this.currentMode = null;
    this.activeTab = null;
    this._wipeSimulationClean();
    this.homeOverlay.style.display = 'flex';
    this.mapOverlay.style.display = 'block';

    // Hide alerts, sidebar, and KPI bar on home
    const alertEl = document.getElementById('alert-panel');
    if (alertEl) alertEl.style.display = 'none';
    if (this.portSidebar) this.portSidebar.wrapper.style.display = 'none';
    const kpiBar = document.getElementById('top-bar-container');
    if (kpiBar) kpiBar.style.display = 'none';

    // Zoom map to Indian Ocean / Middle East — the demo action area
    if (this.mapRenderer && this.mapRenderer.map) {
      this.mapRenderer.map.setView([18, 68], 4, { animate: true, duration: 1.0 });
    }

    // Launch demo activity after a short delay
    setTimeout(() => this._startDemo(), 400);
  }

  openDrawer() {
    if (!this.currentMode) return;
    this.rightPanel.classList.add('open');
    this.drawerToggle.style.display = 'none';
  }

  closeDrawer() {
    this.rightPanel.classList.remove('open');
    if (this.currentMode) {
      this.drawerToggle.style.display = 'flex';
    }
  }

  switchTab(tabId) {
    if (!this.currentMode) return;

    if (this.currentView) {
      this.currentView.unmount();
      this.currentView = null;
    }

    this.activeTab = tabId;
    const mountPoint = this.rightPanel.querySelector('#dashboard-mount-point');

    if (tabId === 'main') {
      if (this.currentMode === 'sandbox') {
        this.currentView = this.sandboxView;
        this.sandboxView.container = mountPoint;
      } else if (this.currentMode === 'irl') {
        this.currentView = this.irlView;
        this.irlView.container = mountPoint;
      }
    } else if (tabId === 'schedule') {
      this.currentView = this.scheduleBoard;
      this.scheduleBoard.container = mountPoint;
    }

    if (this.currentView) {
      this.currentView.mount();
    }

    this.rightPanel.querySelectorAll('.right-panel-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
  }

  _updateTitle() {
    const titles = { sandbox: 'Simulation Sandbox', irl: 'Live Intelligence' };
    const titleEl = this.rightPanel.querySelector('#right-panel-title');
    if (titleEl) titleEl.textContent = titles[this.currentMode] || 'Dashboard';
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  HOME DEMO — spawn ships, anomalies, route highlights               */
  /* ──────────────────────────────────────────────────────────────────── */
  _startDemo() {
    if (this._demoRunning) return;
    this._demoRunning = true;

    const sim = window.simulation;
    if (!sim || !sim.shipments || !sim.events) return;

    // Demo routes — visually striking cross-ocean paths
    const demoRoutes = [
      ['Singapore', 'Rotterdam'],     // through Suez
      ['Shanghai', 'Hamburg'],         // Asia → Europe
      ['Mumbai', 'New York'],          // Indian Ocean → Atlantic
      ['Dubai', 'Rotterdam'],          // Gulf → Europe
      ['Busan', 'Los Angeles'],        // Trans-Pacific
      ['Colombo', 'Durban'],           // Indian Ocean south
      ['Shenzhen', 'Balboa'],          // East Asia → Panama
      ['Tokyo', 'Rotterdam'],          // Full circumnavigation
    ];

    // Stagger ship spawns for visual effect
    demoRoutes.forEach((route, i) => {
      setTimeout(() => {
        if (!this._demoRunning) return;
        sim.shipments.spawnShipment(route[0], route[1], {
          priority: Math.floor(Math.random() * 3) + 2,
          scheduledDepartureDay: 0
        });
      }, i * 300);
    });

    // Inject 2 anomalies for visual drama
    setTimeout(() => {
      if (!this._demoRunning) return;
      // Storm in Indian Ocean
      sim.events.injectGeometricEvent(
        'demo_storm', { lat: 10.0, lng: 65.0 }, 800000,
        'warning', 'Indian Ocean Storm System'
      );
    }, 1500);

    setTimeout(() => {
      if (!this._demoRunning) return;
      // Congestion near Malacca Strait
      sim.events.injectGeometricEvent(
        'demo_congestion', { lat: 4.0, lng: 100.0 }, 400000,
        'critical', 'Malacca Strait Congestion'
      );
    }, 2500);

    // Boost sim speed briefly to get ships moving, then settle
    window.simulationSpeed = 4.0;
    setTimeout(() => {
      window.simulationSpeed = 2.0;
    }, 3000);

    // Highlight 2 major routes after ships are out
    setTimeout(() => {
      if (!this._demoRunning) return;
      try {
        const routes1 = sim.routing.getKShortestPaths('Singapore', 'Rotterdam', 1);
        const routes2 = sim.routing.getKShortestPaths('Shanghai', 'Hamburg', 1);
        const allRoutes = [...routes1, ...routes2];
        if (allRoutes.length > 0 && this.mapRenderer) {
          this.mapRenderer.drawCalculatedRoutes(allRoutes, sim.graph);
        }
      } catch (e) { /* silently ignore */ }
    }, 2000);
  }

  _stopDemo() {
    this._demoRunning = false;
    window.simulationSpeed = 1.0;
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  SIMULATION CLEANUP                                                 */
  /* ──────────────────────────────────────────────────────────────────── */
  _wipeSimulationClean() {
    const sim = window.simulation;
    if (!sim) return;

    if (sim.shipments) {
      sim.shipments.shipments.clear();
      if (this.mapRenderer && this.mapRenderer.shipmentLayers) {
        for (const marker of this.mapRenderer.shipmentLayers.values()) {
          this.mapRenderer.map.removeLayer(marker);
        }
        this.mapRenderer.shipmentLayers.clear();
      }
    }

    if (sim.events) {
      sim.events.activeEvents.clear();
      sim.events._recalculateAllWeights();
    }

    // Clear any route highlights
    if (this.mapRenderer && this.mapRenderer.clearRouteHighlights) {
      this.mapRenderer.clearRouteHighlights();
    }

    // Clear weak point markers
    if (this.mapRenderer && this.mapRenderer.clearWeakPoints) {
      this.mapRenderer.clearWeakPoints();
    }
  }
}
