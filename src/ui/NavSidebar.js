import { ScheduleBoard } from './ScheduleBoard.js';

/**
 * NavSidebar — Application-level orchestrator.
 *
 * UX Model:
 *   - HOME: centered overlay with two choices (Sandbox / Live Intelligence)
 *   - Choosing one enters that MODE. Mode persists until Home is pressed.
 *   - Right panel is a TOOL DRAWER — open/close freely. Closing it does NOT
 *     change mode — you're still in Sandbox/Live, just focusing on the map.
 *   - Schedule Board is a tab INSIDE each dashboard, not its own mode.
 *   - Home button (in left sidebar) explicitly returns to Home overlay.
 */
export class NavSidebar {
  constructor(sandboxView, irlView, mapRenderer) {
    this.sandboxView   = sandboxView;
    this.irlView       = irlView;
    this.mapRenderer   = mapRenderer;
    this.scheduleBoard = new ScheduleBoard(null);

    this.currentView   = null;   // currently mounted view component
    this.currentMode   = null;   // 'sandbox' | 'irl' — persists until Home
    this.activeTab     = null;   // 'main' | 'schedule'

    this._buildHomeOverlay();
    this._buildRightPanel();
    this._buildRightPanelToggle();

    // Boot into Home
    this.goHome();
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  HOME OVERLAY                                                       */
  /* ──────────────────────────────────────────────────────────────────── */
  _buildHomeOverlay() {
    this.homeOverlay = document.createElement('div');
    this.homeOverlay.id = 'home-overlay';
    this.homeOverlay.innerHTML = `
      <div class="home-card-container">
        <div class="home-card" data-target="sandbox">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <div class="home-card-title">Simulation Sandbox</div>
          <div class="home-card-desc">Manual execution environment with system override controls</div>
        </div>
        <div class="home-card" data-target="irl">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <div class="home-card-title">Live Intelligence</div>
          <div class="home-card-desc">Auto-generating operational risks mapping live geopolitics</div>
        </div>
      </div>
    `;
    document.body.appendChild(this.homeOverlay);

    this.homeOverlay.querySelectorAll('.home-card').forEach(card => {
      card.addEventListener('click', () => {
        this.enterMode(card.dataset.target);
      });
    });
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

    // Close button — just hides drawer, does NOT change mode
    this.rightPanel.querySelector('#right-panel-close').addEventListener('click', () => {
      this.closeDrawer();
    });

    // Tab switching: main dashboard vs schedule board
    this.rightPanel.querySelectorAll('.right-panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // Telemetry toggle
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

  /* ──────────────────────────────────────────────────────────────────── */
  /*  RIGHT PANEL TOGGLE — floating button to reopen drawer              */
  /* ──────────────────────────────────────────────────────────────────── */
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
    this.drawerToggle.style.display = 'none'; // hidden until a mode is active
    document.body.appendChild(this.drawerToggle);

    this.drawerToggle.addEventListener('click', () => {
      this.openDrawer();
    });
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  HOME BUTTON (injected into PortSidebar)                            */
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

  /** Enter a mode from the Home screen */
  enterMode(mode) {
    this.homeOverlay.style.display = 'none';
    this.currentMode = mode;

    // Wipe previous sim state
    this._wipeSimulationClean();

    // Mount the mode's dashboard in the right panel
    this.switchTab('main');
    this._updateTitle();
    this.openDrawer();
  }

  /** Return to Home — full reset */
  goHome() {
    this.closeDrawer();
    this.drawerToggle.style.display = 'none';

    if (this.currentView) {
      this.currentView.unmount();
      this.currentView = null;
    }

    this.currentMode = null;
    this.activeTab = null;
    this._wipeSimulationClean();
    this.homeOverlay.style.display = 'flex';
  }

  /** Open the right panel drawer (only if in a mode) */
  openDrawer() {
    if (!this.currentMode) return;
    this.rightPanel.classList.add('open');
    this.drawerToggle.style.display = 'none';
  }

  /** Close the right panel drawer — mode persists */
  closeDrawer() {
    this.rightPanel.classList.remove('open');
    if (this.currentMode) {
      this.drawerToggle.style.display = 'flex';
    }
  }

  /** Switch between "Controls" and "Schedule" tabs */
  switchTab(tabId) {
    if (!this.currentMode) return;

    // Unmount current
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

    // Update tab active states
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
  }
}
