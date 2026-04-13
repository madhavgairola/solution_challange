import { PORTS, PORT_GRAPH } from '../data/network.js';

/**
 * PortSidebar — Retractable left panel showing Global Topologies.
 *
 * Collapsed by default — shows a thin vertical tab handle.
 * Click handle or press toggle to expand/collapse.
 * Home button is injected at the bottom by NavSidebar.
 */
export class PortSidebar {
  constructor(mapRenderer) {
    this.mapRenderer = mapRenderer;
    this.isOpen = false;

    // Outer wrapper that contains the tab handle + panel
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'port-sidebar-wrapper';

    // The tab handle (visible when collapsed)
    this.tabHandle = document.createElement('div');
    this.tabHandle.className = 'port-sidebar-tab';
    this.tabHandle.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      <span class="port-sidebar-tab-label">Topologies</span>
    `;
    this.tabHandle.addEventListener('click', () => this.toggle());
    this.wrapper.appendChild(this.tabHandle);

    // The actual sidebar panel
    this.container = document.createElement('div');
    this.container.className = 'port-sidebar';
    this.wrapper.appendChild(this.container);

    document.body.appendChild(this.wrapper);

    // Group PORTS by region
    this.groups = {};
    PORTS.forEach(p => {
      if (!this.groups[p.region]) this.groups[p.region] = [];
      this.groups[p.region].push(p);
    });

    this.renderOverview();
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.wrapper.classList.toggle('open', this.isOpen);
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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
              <span class="route-dest">${r.to}</span>
            </div>
            <div class="route-time">${r.time} days</div>
          </li>
        `;
      });
    }

    html += `</ul></div>`;

    const homeBtn = this.container.querySelector('.port-sidebar-home-btn');
    this.container.innerHTML = html;
    if (homeBtn) this.container.appendChild(homeBtn);

    document.getElementById('sidebar-back-btn').onclick = () => this.renderOverview();

    const routeItems = this.container.querySelectorAll('.route-item');
    routeItems.forEach(item => {
      item.addEventListener('click', () => {
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
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <h2 class="panel-title">Global Topologies</h2>
          <div class="port-sidebar-collapse-btn" id="collapse-topologies">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </div>
        </div>
      </div>
      <div class="sidebar-content accordion-view">
    `;

    for (const [region, portsList] of Object.entries(this.groups)) {
      html += `
        <div class="region-group">
          <div class="region-title">${region}</div>
          <ul class="port-list">`;

      portsList.forEach(p => {
        html += `<li class="port-link" data-port="${p.id}">${p.name}</li>`;
      });

      html += `</ul></div>`;
    }

    html += `</div>`;

    const homeBtn = this.container.querySelector('.port-sidebar-home-btn');
    this.container.innerHTML = html;
    if (homeBtn) this.container.appendChild(homeBtn);

    // Collapse button
    const collapseBtn = this.container.querySelector('#collapse-topologies');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => this.toggle());
    }

    // Port click listeners
    const links = this.container.querySelectorAll('.port-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const portId = e.currentTarget.getAttribute('data-port');
        this.showPortDetails(portId);
      });
    });
  }
}
