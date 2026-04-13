import { PORTS } from '../data/network.js';

/**
 * TelemetryPanel — Fleet telemetry display.
 *
 * Now mounted inside the right panel's #telemetry-mount div
 * instead of floating as a fixed overlay.
 * Displays ship cards vertically in a compact format.
 */
export class TelemetryPanel {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'telemetry-panel-inner';
    this.lastRenderTime = 0;
    this.render();
  }

  /**
   * Mount into a target DOM element (called by main.js after NavSidebar builds)
   */
  mountInto(targetEl) {
    if (targetEl) {
      targetEl.appendChild(this.container);
    }
  }

  render() {
    this.update();
  }

  update(shipments) {
    if (Date.now() - this.lastRenderTime < 300) return;
    this.lastRenderTime = Date.now();

    if (!shipments || shipments.length === 0) {
      this.container.innerHTML = `
        <div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 8px;">
          Fleet Idle. Awaiting Deployments...
        </div>`;
      return;
    }

    let html = '';

    shipments.slice(-12).forEach(ship => {
      let statusColor = 'var(--info)';
      let displayStatus = ship.status.toUpperCase();
      
      if (ship._isEvadingVisually && ship.status === 'moving') {
        statusColor = '#d946ef'; displayStatus = 'EVADING';
      } else if (ship.status === 'rerouting')  { statusColor = 'var(--danger)';
      } else if (ship.status === 'waiting')    { statusColor = 'var(--warning)';
      } else if (ship.status === 'port_wait')  { statusColor = 'var(--info)'; displayStatus = 'PORT WAIT';
      } else if (ship.status === 'completed')  { statusColor = 'var(--accent)'; }

      const originName = PORTS.find(p => p.id === ship.origin)?.name || ship.origin;
      const destName   = PORTS.find(p => p.id === ship.destination)?.name || ship.destination;

      let healthText = 'Nominal'; let healthColor = 'var(--accent)';
      if (ship.currentHealthDegradation && ship.currentHealthDegradation > 100) {
        const pct = ship.currentHealthDegradation.toFixed(0);
        if (ship.currentHealthDegradation > 130) { healthText = `Critical ${pct}%`; healthColor = 'var(--danger)'; }
        else { healthText = `Elevated ${pct}%`; healthColor = 'var(--warning)'; }
      }

      const delayVal = ship.totalPredictedDelay > 0.1 ? `+${ship.totalPredictedDelay.toFixed(1)}d` : `None`;
      const delayColor = ship.totalPredictedDelay > 0.1 ? 'var(--danger)' : 'var(--accent)';

      html += `
        <div class="telemetry-ship-card" style="border-left: 3px solid ${statusColor};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size:11px; font-weight:600; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
              <div style="width:5px; height:5px; border-radius:50%; background:${statusColor}; box-shadow: 0 0 4px ${statusColor};"></div>
              ${ship.id}
            </div>
            <div style="font-size:9px; font-weight:600; color:var(--text-muted); letter-spacing:0.5px;">${displayStatus}</div>
          </div>
          <div style="font-size:10px; color:var(--text-secondary); margin-bottom:4px;">
            ${originName} <span style="color:var(--text-muted)">→</span> ${destName}
          </div>
          <div style="display:flex; justify-content:space-between; font-size:9px;">
            <span style="color:var(--text-muted);">Health: <span style="color:${healthColor};">${healthText}</span></span>
            <span style="color:var(--text-muted);">Delay: <span style="color:${delayColor};">${delayVal}</span></span>
          </div>
        </div>
      `;
    });

    this.container.innerHTML = html;
  }
}
