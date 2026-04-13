import { ScheduleBoard } from './ScheduleBoard.js';

/**
 * NavSidebar — Application-level orchestrator.
 *
 * Manages three UI regions:
 *   1. Home Overlay   — centered card picker (Sandbox / Live / Schedule)
 *   2. Right Panel    — slide-in panel hosting the selected dashboard + fleet telemetry
 *   3. Home Button    — injected at the bottom of the left PortSidebar
 */
export class NavSidebar {
  constructor(sandboxView, irlView, mapRenderer) {
    this.sandboxView   = sandboxView;
    this.irlView       = irlView;
    this.mapRenderer   = mapRenderer;
    this.scheduleBoard = new ScheduleBoard(null);

    this.currentView   = null;
    this.currentViewId = null;

    this._buildHomeOverlay();
    this._buildRightPanel();

    // Show Home on boot
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
        <div class="home-card" data-target="schedule">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <div class="home-card-title">Schedule Board</div>
          <div class="home-card-desc">Vessel departure schedules and route timetables</div>
        </div>
      </div>
    `;
    document.body.appendChild(this.homeOverlay);

    // Bind clicks
    this.homeOverlay.querySelectorAll('.home-card').forEach(card => {
      card.addEventListener('click', () => {
        const target = card.dataset.target;
        this.openDashboard(target);
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  RIGHT PANEL                                                        */
  /* ──────────────────────────────────────────────────────────────────── */
  _buildRightPanel() {
    this.rightPanel = document.createElement('div');
    this.rightPanel.id = 'right-panel';
    this.rightPanel.className = 'right-panel';
    this.rightPanel.innerHTML = `
      <div class="right-panel-header">
        <div class="right-panel-title" id="right-panel-title">Dashboard</div>
        <div class="right-panel-close" id="right-panel-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
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

    // Close button
    this.rightPanel.querySelector('#right-panel-close').addEventListener('click', () => {
      this.goHome();
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
  /*  HOME BUTTON (injected into PortSidebar after it mounts)            */
  /* ──────────────────────────────────────────────────────────────────── */
  injectHomeButton(portSidebar) {
    this.portSidebar = portSidebar;
    const homeBtn = document.createElement('div');
    homeBtn.className = 'port-sidebar-home-btn';
    homeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      <span>Home</span>
    `;
    homeBtn.addEventListener('click', () => this.goHome());
    portSidebar.container.appendChild(homeBtn);
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  NAVIGATION                                                         */
  /* ──────────────────────────────────────────────────────────────────── */
  goHome() {
    // Close right panel
    this.rightPanel.classList.remove('open');

    // Unmount current view
    if (this.currentView) {
      this.currentView.unmount();
      this.currentView = null;
      this.currentViewId = null;
    }

    // Show home overlay
    this.homeOverlay.style.display = 'flex';
  }

  openDashboard(viewId) {
    // Hide home overlay
    this.homeOverlay.style.display = 'none';

    // Unmount previous
    if (this.currentView) {
      this.currentView.unmount();
    }

    // Wipe sim state when switching between dashboards (not schedule)
    if (viewId !== 'schedule' && this.currentViewId !== viewId) {
      this._wipeSimulationClean();
    }

    this.currentViewId = viewId;

    // Title labels
    const titles = {
      sandbox:  'Simulation Sandbox',
      irl:      'Live Intelligence',
      schedule: 'Schedule Board',
    };
    this.rightPanel.querySelector('#right-panel-title').textContent = titles[viewId] || 'Dashboard';

    // Mount new view
    const mountPoint = this.rightPanel.querySelector('#dashboard-mount-point');
    if (viewId === 'sandbox') {
      this.currentView = this.sandboxView;
      this.sandboxView.container = mountPoint;
    } else if (viewId === 'irl') {
      this.currentView = this.irlView;
      this.irlView.container = mountPoint;
    } else if (viewId === 'schedule') {
      this.currentView = this.scheduleBoard;
      this.scheduleBoard.container = mountPoint;
    }

    if (this.currentView) {
      this.currentView.mount();
    }

    // Open right panel
    this.rightPanel.classList.add('open');
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

    console.log('[NavSidebar] Simulation state wiped.');
  }
}
