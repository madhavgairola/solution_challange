export class NavSidebar {
  constructor(sandboxView, irlView, mapRenderer) {
    this.sandboxView = sandboxView;
    this.irlView = irlView;
    this.mapRenderer = mapRenderer;

    this.expanded = false;
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
      <div class="nav-header">
        <h2>Control Modules</h2>
        <span class="nav-desc">Select Operational Environment</span>
      </div>
      <div class="nav-links">
        <div class="nav-item" data-target="sandbox">
          <span>🧪 Simulation Sandbox</span>
        </div>
        <div class="nav-item" data-target="irl">
          <span>🌍 Real-World Feed</span>
        </div>
      </div>
      <div id="dashboard-mount-point" class="dashboard-mount">
         <!-- Dynamic Dashboard Content Injected Here -->
      </div>
    `;
  }

  bindEvents() {
    this.toggleBtn.addEventListener('click', () => {
      this.expanded = !this.expanded;
      if (this.expanded) {
        this.sidebar.classList.add('open');
        this.toggleBtn.classList.add('open');
      } else {
        this.sidebar.classList.remove('open');
        this.toggleBtn.classList.remove('open');
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

    // 2. Clear massive simulation state to baseline 
    this._wipeSimulationClean();

    // 3. Mount targeted component
    const mountPoint = this.sidebar.querySelector('#dashboard-mount-point');
    if (viewId === 'sandbox') {
       this.currentView = this.sandboxView;
       this.sandboxView.container = mountPoint;
    } else if (viewId === 'irl') {
       this.currentView = this.irlView;
       this.irlView.container = mountPoint;
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
        // Stop all active
        sim.shipments.shipments.clear();
        // Clear mapping visuals natively
        if(this.mapRenderer && this.mapRenderer.shipmentLayers) {
           for(const marker of this.mapRenderer.shipmentLayers.values()) {
              this.mapRenderer.map.removeLayer(marker);
           }
           this.mapRenderer.shipmentLayers.clear();
        }
     }

     // 2. Wipe Events (IRL and Sandbox manually spawned)
     if (sim.events) {
        sim.events.activeEvents.clear();
        sim.events._recalculateAllWeights();
        // Map renderer automatically clears eventLayers on _recalculateAllWeights calling renderEvents()
     }

     console.log('🧹 Simulation Graph Wiped Clean.');
  }
}
