import { PORTS, PORT_GRAPH } from '../data/network.js';

export class PortSidebar {
  constructor(mapRenderer) {
    this.mapRenderer = mapRenderer;
    this.isOpen = false;
    this.container = document.createElement('div');
    this.container.className = 'port-sidebar';
    
    // Group PORTS by region
    this.groups = {};
    PORTS.forEach(p => {
      if (!this.groups[p.region]) this.groups[p.region] = [];
      this.groups[p.region].push(p);
    });

    document.body.appendChild(this.container);

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'sidebar-toggle-btn';
    this.toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;
    this.toggleBtn.onclick = () => this.toggle();
    document.body.appendChild(this.toggleBtn);

    this.renderOverview();
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.container.classList.add('open');
      this.toggleBtn.classList.add('shifted');
    } else {
      this.container.classList.remove('open');
      this.toggleBtn.classList.remove('shifted');
      // Reset view to overview on close
      setTimeout(() => this.renderOverview(), 300);
    }
  }

  showPortDetails(portId) {
    if (!this.isOpen) this.toggle();

    const port = PORTS.find(p => p.id === portId);
    if (!port) return;

    if (this.mapRenderer) {
      this.mapRenderer.setActivePort(portId);
    }

    const routes = PORT_GRAPH[portId] || [];

    let html = `
      <div class="sidebar-header">
        <button class="back-btn" id="sidebar-back-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back
        </button>
        <h2 class="port-title">${port.name}</h2>
        <span class="port-region">${port.region}</span>
      </div>
      <div class="sidebar-content detail-view">
        <h3 class="routes-header">Outgoing Routes</h3>
        <ul class="routes-list">
    `;

    if (routes.length === 0) {
      html += `<li class="no-routes">No direct outbound shipping paths configured.</li>`;
    } else {
      routes.forEach(r => {
        html += `
          <li class="route-item" data-dest="${r.to}">
            <div class="route-name">
              <span class="route-origin">${port.name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
              <span class="route-dest">${r.to}</span>
            </div>
            <div class="route-time">
              ${r.time} days
            </div>
          </li>
        `;
      });
    }

    html += `
        </ul>
      </div>
    `;

    this.container.innerHTML = html;
    
    document.getElementById('sidebar-back-btn').onclick = () => this.renderOverview();
    
    const routeItems = this.container.querySelectorAll('.route-item');
    routeItems.forEach(item => {
      item.addEventListener('click', (e) => {
        routeItems.forEach(i => i.classList.remove('selected-route'));
        item.classList.add('selected-route');
        
        if (this.mapRenderer) {
          this.mapRenderer.setActivePort(portId, item.getAttribute('data-dest'));
        }
      });
    });
  }

  renderOverview() {
    if (this.mapRenderer) {
      this.mapRenderer.setActivePort(null);
    }

    let html = `
      <div class="sidebar-header">
        <h2 class="panel-title">Global Topologies</h2>
      </div>
      <div class="sidebar-content accordion-view">
    `;

    for (const [region, portsList] of Object.entries(this.groups)) {
      html += `
        <div class="region-group">
          <div class="region-title">${region}</div>
          <ul class="port-list">`;
      
      portsList.forEach(p => {
        html += `
            <li class="port-link" data-port="${p.id}">
              ${p.name}
            </li>
        `;
      });

      html += `
          </ul>
        </div>
      `;
    }

    html += `</div>`;
    this.container.innerHTML = html;

    // Attach click listeners to individual port listings
    const links = this.container.querySelectorAll('.port-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const portId = e.currentTarget.getAttribute('data-port');
        this.showPortDetails(portId);
      });
    });
  }
}
