import { ScheduleBoard } from './ScheduleBoard.js';

export class NavSidebar {
  constructor(sandboxView, irlView, mapRenderer) {
    this.sandboxView   = sandboxView;
    this.irlView       = irlView;
    this.mapRenderer   = mapRenderer;
    this.scheduleBoard = new ScheduleBoard(null);

    this.expanded    = false;
    this.currentView = null;

    // Create Root Elements
    // Deprecated Nav Toggle Button
    // this.toggleBtn was removed per user request

    this.sidebar = document.createElement('div');
    this.sidebar.className = 'nav-sidebar';
    document.body.appendChild(this.sidebar);

    this.render();
    this.bindEvents();

    // Default boot
    this.switchDashboard('sandbox');
  }

  render() {
    this.sidebar.innerHTML = `
      <div class="nav-links" style="display: flex; flex-direction: column; gap: 16px;">
        <div class="nav-item" data-target="sandbox" title="Simulation Sandbox">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        </div>
        <div class="nav-item" data-target="irl" title="Real-World Feed">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        </div>
        <div class="nav-item" data-target="schedule" title="Schedule Board">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
      </div>
    `;

    // Extract mount point to a separate floating panel
    this.mountPanel = document.createElement('div');
    this.mountPanel.className = 'floating-mount-panel';
    this.mountPanel.innerHTML = `<div id="dashboard-mount-point" class="dashboard-mount"></div>`;
    document.body.appendChild(this.mountPanel);
  }

  bindEvents() {
    // Panel starts automatically mounted
    this.mountPanel.style.display = 'flex';
    this.expanded = true;

    const links = this.sidebar.querySelectorAll('.nav-item');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-target');
        this.switchDashboard(targetId);

        // Update active UI
        links.forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });
  }

  switchDashboard(viewId) {
    // 1. Unmount existing
    if (this.currentView) {
      this.currentView.unmount();
    }

    // 2. Only wipe simulation state when switching away from schedule board
    //    (schedule board is read-only — no need to destroy ships)
    if (viewId !== 'schedule') {
      this._wipeSimulationClean();
    }

    // 3. Mount targeted component
    const mountPoint = this.mountPanel.querySelector('#dashboard-mount-point');
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
  }

  _wipeSimulationClean() {
    const sim = window.simulation;
    if (!sim) return;

    // 1. Wipe Shipments
    if (sim.shipments) {
      sim.shipments.shipments.clear();
      if (this.mapRenderer && this.mapRenderer.shipmentLayers) {
        for (const marker of this.mapRenderer.shipmentLayers.values()) {
          this.mapRenderer.map.removeLayer(marker);
        }
        this.mapRenderer.shipmentLayers.clear();
      }
    }

    // 2. Wipe Events
    if (sim.events) {
      sim.events.activeEvents.clear();
      sim.events._recalculateAllWeights();
    }

    console.log('🧹 Simulation Graph Wiped Clean.');
  }
}
