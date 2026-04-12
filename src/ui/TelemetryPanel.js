import { PORTS } from '../data/network.js';

export class TelemetryPanel {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'telemetry-panel';
    document.body.appendChild(this.container);

    this.lastRenderTime = 0;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="telemetry-header">
        <h3>📊 Fleet Intelligence Telemetry</h3>
      </div>
      <div class="telemetry-content" id="telemetry-content">
         <div style="color: #64748b; font-size: 0.8rem; text-align: center; padding: 10px;">Awaiting Agent Data...</div>
      </div>
    `;
  }

  // Called natively from ShipmentEngine on 60FPS loop, but throttled locally to prevent DOM melting
  update(shipments) {
    if (Date.now() - this.lastRenderTime < 300) return; // 300ms UI throttler
    this.lastRenderTime = Date.now();

    const contentBox = this.container.querySelector('#telemetry-content');
    if (!contentBox) return;

    if (!shipments || shipments.length === 0) {
        contentBox.innerHTML = '<div style="color: #64748b; font-size: 0.8rem; text-align: center; padding: 10px;">Fleet Idle. Awaiting Deployments...</div>';
        return;
    }

    let html = '';
    
    // Sort so newest or most critical ships are visible
    // We'll just map them natively
    shipments.slice(-8).forEach(ship => { // Show max 8 ships to prevent screen overflow
        
        // Status colorization mapping
        let statusColor = '#38bdf8'; // Blue (Moving)
        let displayStatus = ship.status.toUpperCase();
        
        // BUG 2 FIX: Check _isEvadingVisually FIRST before defaulting to status color
        // (evading ships still have status === 'moving', so it must be checked before the default)
        if (ship._isEvadingVisually && ship.status === 'moving') {
             statusColor = '#d946ef'; // Magenta Evasion Active!
             displayStatus = 'EVADING';
        } else if (ship.status === 'rerouting') {
             statusColor = '#f43f5e';
        } else if (ship.status === 'waiting') {
             statusColor = '#fbbf24';
        } else if (ship.status === 'completed') {
             statusColor = '#10b981';
        }

        // Translate nodes to names
        const originName = PORTS.find(p => p.id === ship.origin)?.name || ship.origin;
        const destName = PORTS.find(p => p.id === ship.destination)?.name || ship.destination;

        // Path Health metrics expose Agent Internal Logic to Judges!
        let healthText = '100%';
        let healthColor = '#10b981'; // Green
        
        // BUG 1 FIX: Only show health warning when actually degraded (> 100), not at baseline
        if (ship.currentHealthDegradation && ship.currentHealthDegradation > 100) {
           const percent = ship.currentHealthDegradation.toFixed(0);
           if (ship.currentHealthDegradation > 130) {
              healthText = `${percent}% (Critical → Rerouting)`;
              healthColor = '#f43f5e';
           } else {
              healthText = `${percent}% (Elevated)`;
              healthColor = '#fbbf24';
           }
        }

        html += `
          <div class="telemetry-agent-card" style="border-left: 3px solid ${statusColor}">
             <div class="agent-id">ID: ${ship.id} <span class="agent-status" style="color:${statusColor}">[${displayStatus}]</span></div>
             <div class="agent-route">${originName} -> ${destName}</div>
             <div class="agent-health">Path Volatility: <span style="color:${healthColor}; font-weight:bold;">${healthText}</span></div>
          </div>
        `;
    });

    contentBox.innerHTML = html;
  }
}
