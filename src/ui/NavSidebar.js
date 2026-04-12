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
    this.toggleBtn = document.createElement('div');
    this.toggleBtn.className = 'nav-toggle-btn';
    this.toggleBtn.innerHTML = '⚙️';
    document.body.appendChild(this.toggleBtn);

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
          <span style="font-size: 20px;">⚙️</span>
        </div>
        <div class="nav-item" data-target="irl" title="Real-World Feed">
          <span style="font-size: 20px;">🌍</span>
        </div>
        <div class="nav-item" data-target="schedule" title="Schedule Board">
          <span style="font-size: 20px;">🗓️</span>
        </div>
      </div>
    `;

    // Extract mount point to a separate floating panel
    this.mountPanel = document.createElement('div');
    this.mountPanel.className = 'glass-panel';
    Object.assign(this.mountPanel.style, {
      position: 'fixed',
      top: '90px',
      left: '90px',
      width: '320px',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: '1500',
      display: 'none', // Hidden until toggled
      flexDirection: 'column',
    });
    this.mountPanel.innerHTML = `<div id="dashboard-mount-point" class="dashboard-mount"></div>`;
    document.body.appendChild(this.mountPanel);
  }

  bindEvents() {
    this.toggleBtn.addEventListener('click', () => {
      this.expanded = !this.expanded;
      if (this.expanded) {
        this.mountPanel.style.display = 'flex';
        this.toggleBtn.style.background = 'var(--accent-soft)';
        this.toggleBtn.style.color = 'var(--accent)';
      } else {
        this.mountPanel.style.display = 'none';
        this.toggleBtn.style.background = 'var(--bg-glass)';
        this.toggleBtn.style.color = 'var(--text-primary)';
      }
    });

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
