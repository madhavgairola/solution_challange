import { EVENT_RULES } from '../engine/EventEngine';

export class EventPanel {
  constructor(containerId, eventEngine, graph, onEventInjected) {
    this.container = document.getElementById(containerId);
    this.eventEngine = eventEngine;
    this.graph = graph;
    this.onEventInjected = onEventInjected;
    
    this.render();
  }

  render() {
    const panelHTML = `
      <div id="event-panel" class="premium-panel">
        <h2 class="panel-title">⚠️ Inject Disruption</h2>
        
        <div class="form-group">
          <label>Event Type</label>
          <select id="event-select" class="premium-input">
            ${Object.keys(EVENT_RULES).map(key => `<option value="${key}">${EVENT_RULES[key].name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Target Location</label>
          <select id="target-select" class="premium-input">
             <!-- Populated dynamically based on event type -->
          </select>
        </div>

        <button id="inject-btn" class="inject-btn">TRIGGER DISRUPTION</button>

        <div id="active-events-container">
          <h3 class="panel-subtitle">Active Threats</h3>
          <ul id="active-events-list"></ul>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', panelHTML);

    this.eventSelect = document.getElementById('event-select');
    this.targetSelect = document.getElementById('target-select');
    this.injectBtn = document.getElementById('inject-btn');
    this.activeList = document.getElementById('active-events-list');

    this.eventSelect.addEventListener('change', () => this.updateTargetOptions());
    this.injectBtn.addEventListener('click', () => this.handleInject());

    this.updateTargetOptions(); // initial load
  }

  updateTargetOptions() {
    const ruleKey = this.eventSelect.value;
    const rule = EVENT_RULES[ruleKey];
    
    this.targetSelect.innerHTML = '';

    if (rule.type === 'NODE') {
      const nodes = this.graph.getAllNodes().sort((a,b) => a.name.localeCompare(b.name));
      nodes.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n.id;
        opt.textContent = `${n.name} (${n.id})`;
        this.targetSelect.appendChild(opt);
      });
    } else if (rule.type === 'REGION') {
      const regions = [...new Set(this.graph.getAllNodes().map(n => n.region))].sort();
      regions.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        this.targetSelect.appendChild(opt);
      });
    }
  }

  handleInject() {
    const ruleKey = this.eventSelect.value;
    const targetId = this.targetSelect.value;
    const eventId = `EVT-${Date.now()}`;

    this.eventEngine.injectEvent(eventId, ruleKey, targetId);
    this.renderActiveEvents();
    
    // Callback to visually update UI/Routing
    if (this.onEventInjected) {
      this.onEventInjected(eventId, ruleKey, targetId);
    }
  }

  handleClear(eventId) {
    this.eventEngine.clearEvent(eventId);
    this.renderActiveEvents();
    
    if (this.onEventInjected) {
      this.onEventInjected(null, null, null); // trigger redraw
    }
  }

  renderActiveEvents() {
    this.activeList.innerHTML = '';
    const events = Array.from(this.eventEngine.activeEvents.values());

    if (events.length === 0) {
      this.activeList.innerHTML = '<li class="no-events">No active threats. Network optimal.</li>';
      return;
    }

    events.forEach(evt => {
      const li = document.createElement('li');
      li.className = 'active-event-item';
      li.innerHTML = `
        <div class="event-info">
          <span class="event-name">${evt.rule.name}</span>
          <span class="event-target">${evt.targetId}</span>
        </div>
        <button class="clear-btn" data-id="${evt.id}">Clear</button>
      `;
      this.activeList.appendChild(li);
    });

    // Add clear listeners
    this.activeList.querySelectorAll('.clear-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleClear(e.target.getAttribute('data-id'));
      });
    });
  }
}
