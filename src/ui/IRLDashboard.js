export class IRLDashboard {
  constructor(container, liveAgent) {
    this.container = container;
    this.liveAgent = liveAgent;
    this.element = document.createElement('div');
    this.element.className = 'dashboard-content-layer';
    
    // Bind the log callback internally
    this.liveAgent.setLogCallback((msg) => this.appendLog(msg));
    this.render();
  }

  mount() {
    this.container.appendChild(this.element);
    this.liveAgent.start();
  }

  unmount() {
    this.liveAgent.stop();
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  render() {
    this.element.innerHTML = `
      <div class="control-group">
        <h3 class="dash-title" style="color: #38bdf8;">🌍 Real-World Intelligence</h3>
        <p class="panel-desc">Auto-generating operational risks mapping live geopolitics.</p>
        <div class="live-terminal" id="irl-terminal">
          <div class="terminal-line">[System] Secure Intelligence Relay Hooked...</div>
        </div>
      </div>
    `;
  }

  appendLog(msg) {
    const terminal = this.element.querySelector('#irl-terminal');
    if (!terminal) return;

    const line = document.createElement('div');
    line.className = 'terminal-line';
    
    if (msg.includes('CRITICAL') || msg.includes('BLOCKED')) line.style.color = '#ef4444';
    else if (msg.includes('WARNING')) line.style.color = '#fbbf24';
    else if (msg.includes('RESOLVED')) line.style.color = '#10b981';

    line.innerText = msg;
    terminal.appendChild(line);

    terminal.scrollTop = terminal.scrollHeight;
  }
}
