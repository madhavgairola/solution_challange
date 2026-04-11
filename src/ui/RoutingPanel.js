export class RoutingPanel {
  constructor(containerId, graph, routingEngine, onRouteCalculated) {
    this.container = document.getElementById(containerId);
    this.graph = graph;
    this.routingEngine = routingEngine;
    this.onRouteCalculated = onRouteCalculated;
    
    this.render();
  }

  render() {
    const panelHTML = `
      <div id="routing-panel" class="premium-panel routing-panel">
        <h2 class="panel-title">🧭 Route Planner</h2>
        
        <div class="form-group">
          <label>Source Port</label>
          <select id="route-source" class="premium-input"></select>
        </div>

        <div class="form-group">
          <label>Destination Port</label>
          <select id="route-dest" class="premium-input"></select>
        </div>

        <div class="weights-container">
          <label class="weights-label">Optimization Weights</label>
          <div class="weight-sliders">
            <div class="slider-group">
              <span title="Time">⏱️</span>
              <input type="range" id="w-time" min="0" max="5" step="0.5" value="1">
            </div>
            <div class="slider-group">
              <span title="Cost">💰</span>
              <input type="range" id="w-cost" min="0" max="5" step="0.5" value="1">
            </div>
            <div class="slider-group">
              <span title="Risk">⚠️</span>
              <input type="range" id="w-risk" min="0" max="5" step="0.5" value="1">
            </div>
          </div>
        </div>

        <button id="calc-route-btn" class="inject-btn calc-btn">CALCULATE ROUTES</button>

        <div id="route-results-container">
          <h3 class="panel-subtitle">Calculated Paths</h3>
          <div id="route-results-list"></div>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', panelHTML);

    this.sourceSelect = document.getElementById('route-source');
    this.destSelect = document.getElementById('route-dest');
    this.calcBtn = document.getElementById('calc-route-btn');
    this.resultsList = document.getElementById('route-results-list');

    this.wTime = document.getElementById('w-time');
    this.wCost = document.getElementById('w-cost');
    this.wRisk = document.getElementById('w-risk');

    this.populateDropdowns();
    this.calcBtn.addEventListener('click', () => this.handleCalculate());
  }

  populateDropdowns() {
    const nodes = this.graph.getAllNodes().sort((a,b) => a.name.localeCompare(b.name));
    let optionsHTML = '';
    nodes.forEach(n => {
      optionsHTML += `<option value="${n.id}">${n.name}</option>`;
    });

    this.sourceSelect.innerHTML = optionsHTML;
    this.destSelect.innerHTML = optionsHTML;

    // Set some defaults (e.g., Mumbai to Singapore as per spec)
    const intialSource = nodes.find(n => n.name.includes('Mumbai'))?.id;
    const initialDest = nodes.find(n => n.name.includes('Singapore'))?.id;
    if (intialSource) this.sourceSelect.value = intialSource;
    if (initialDest) this.destSelect.value = initialDest;
  }

  handleCalculate() {
    const source = this.sourceSelect.value;
    const dest = this.destSelect.value;
    
    if (source === dest) {
      this.resultsList.innerHTML = '<div class="no-events">Source and Destination are the same.</div>';
      return;
    }

    const weights = {
      w_time: parseFloat(this.wTime.value),
      w_cost: parseFloat(this.wCost.value),
      w_risk: parseFloat(this.wRisk.value)
    };

    const routes = this.routingEngine.getKShortestPaths(source, dest, weights, 3);
    
    this.renderResults(routes);

    if (this.onRouteCalculated) {
      this.onRouteCalculated(routes);
    }
  }

  renderResults(routes) {
    this.resultsList.innerHTML = '';
    if (!routes || routes.length === 0) {
      this.resultsList.innerHTML = '<div class="no-events" style="color: #f87171;">No viable path exists.</div>';
      return;
    }

    const colors = ['#10b981', '#fbbf24', '#f97316']; // optimal, alt1, alt2

    routes.forEach((route, idx) => {
      const type = idx === 0 ? 'Optimal' : `Alternate ${idx}`;
      const color = colors[idx] || '#cbd5e1';

      const card = document.createElement('div');
      card.className = 'route-card';
      card.style.borderLeft = `4px solid ${color}`;
      
      card.innerHTML = `
        <div class="route-header">
          <span class="route-type" style="color: ${color}">${type}</span>
          <span class="route-score">Score: ${route.score.toFixed(1)}</span>
        </div>
        <div class="route-metrics">
          <span>⏱️ ${route.totalTime.toFixed(0)}</span>
          <span>💰 ${route.totalCost.toFixed(0)}</span>
          <span>⚠️ ${route.totalRisk.toFixed(0)}</span>
        </div>
        <div class="route-path-text" title="${route.path.join(' → ')}">
          ${route.path.join(' → ')}
        </div>
      `;
      this.resultsList.appendChild(card);
    });
  }
}
