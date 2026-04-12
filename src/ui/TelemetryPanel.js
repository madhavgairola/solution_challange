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
    const priorityStars = (p) => '★'.repeat(p) + '☆'.repeat(5 - p);

    // ── Segment Chain Renderer ─────────────────────────────────────────
    // Renders a mini timeline of each hop: completed/current/predicted/missed
    const buildSegmentChain = (ship) => {
      if (!ship.segments || ship.segments.length === 0) return '';
      const preds = ship.segmentPredictions || [];
      const predMap = new Map(preds.map(p => [p.from + '-' + p.to, p]));

      const badges = ship.segments.map((seg, idx) => {
        const isCompleted = seg.status === 'completed' || seg.status === 'delayed';
        const isCurrent   = idx === ship.currentEdgeIndex && ship.status === 'moving';
        const pred        = predMap.get(seg.from + '-' + seg.to);

        let icon  = '📅'; let color = '#475569'; let delayText = '';

        if (isCompleted) {
          const d = seg.delay;
          if (seg.missedConnection) { icon = '⚠️'; color = '#f43f5e'; delayText = `+${d.toFixed(1)}d`; }
          else if (d > 0.1)         { icon = '🕒'; color = '#fbbf24'; delayText = `+${d.toFixed(1)}d`; }
          else                      { icon = '✅'; color = '#10b981'; }
        } else if (isCurrent) {
          icon = '🚢'; color = '#38bdf8';
          if (pred && pred.predictedDelay > 0.1) delayText = `~+${pred.predictedDelay.toFixed(1)}d`;
        } else if (pred) {
          if (pred.willMissConnection) { icon = '⚡'; color = '#f97316'; delayText = `~+${pred.predictedDelay.toFixed(1)}d`; }
          else if (pred.predictedDelay > 0.1) { icon = '📅'; color = '#fbbf24'; delayText = `~+${pred.predictedDelay.toFixed(1)}d`; }
        }

        return `<span title="${seg.from}→${seg.to}" style="color:${color}; font-size:9px; white-space:nowrap;">${icon}${delayText ? '<sub style="font-size:8px">'+delayText+'</sub>' : ''}</span>`;
      });

      const totalDelay = ship.totalPredictedDelay;
      const delayBadge = totalDelay > 0.1
        ? `<span style="color:#f43f5e; font-size:9px; margin-left:4px;">▶ +${totalDelay.toFixed(1)}d total</span>` : '';

      return `
        <div style="margin-top:5px; border-top: 1px solid rgba(255,255,255,0.05); padding-top:4px;">
          <div style="font-size:9px; color:#475569; margin-bottom:2px;">SEGMENT CHAIN</div>
          <div style="display:flex; align-items:center; gap:3px; flex-wrap:wrap;">
            ${badges.join('<span style="color:#334155; font-size:8px;">──</span>')}
            ${delayBadge}
          </div>
        </div>`;
    };
    

    shipments.slice(-8).forEach(ship => {
        let statusColor = '#38bdf8';
        let displayStatus = ship.status.toUpperCase();
        
        if (ship._isEvadingVisually && ship.status === 'moving') {
             statusColor = '#d946ef'; displayStatus = 'EVADING';
        } else if (ship.status === 'rerouting') { statusColor = '#f43f5e';
        } else if (ship.status === 'waiting')   { statusColor = '#fbbf24';
        } else if (ship.status === 'completed') { statusColor = '#10b981'; }

        const originName = PORTS.find(p => p.id === ship.origin)?.name || ship.origin;
        const destName   = PORTS.find(p => p.id === ship.destination)?.name || ship.destination;

        let healthText = '100%'; let healthColor = '#10b981';
        if (ship.currentHealthDegradation && ship.currentHealthDegradation > 100) {
           const pct = ship.currentHealthDegradation.toFixed(0);
           if (ship.currentHealthDegradation > 130) { healthText = `${pct}% ⚠️ Critical`; healthColor = '#f43f5e'; }
           else { healthText = `${pct}% 📈 Elevated`; healthColor = '#fbbf24'; }
        }

        const kmTravelled = ship.totalDistanceTravelled ? `${Math.round(ship.totalDistanceTravelled).toLocaleString()} km` : '—';
        const daysTravelled = ship.totalTimeSpent ? `${ship.totalTimeSpent.toFixed(1)}d` : '—';
        const rerouteInfo = ship.rerouteCount > 0 ? `🔁 ${ship.rerouteCount}` : '—';
        const waitReason = ship.waitingReason ? `<div class="agent-wait">⏳ ${ship.waitingReason}</div>` : '';
        const eventInfo = ship.affectedByEvents && ship.affectedByEvents.length > 0
          ? `<div class="agent-events">⚡ Disruptions: ${ship.affectedByEvents.slice(-2).join(', ')}</div>` : '';

        html += `
          <div class="telemetry-agent-card" style="border-left: 3px solid ${statusColor}">
             <div class="agent-id">${ship.cargoEmoji || '🚢'} <b>${ship.id}</b> <span style="color:${statusColor}">[${displayStatus}]</span></div>
             <div class="agent-route" style="color:#94a3b8; font-size:11px;">${originName} → ${destName}</div>
             <div style="display:flex; gap:8px; font-size:10px; color:#64748b; margin-top:3px;">
               <span title="Cargo">${ship.cargoLabel || 'General'}</span>
               <span title="Priority" style="color:#fbbf24;">${priorityStars(ship.priority || 3)}</span>
               <span title="Reroutes">🔁 ${ship.rerouteCount || 0}</span>
             </div>
             <div class="agent-health" style="margin-top:4px;">Path Health: <span style="color:${healthColor}; font-weight:bold;">${healthText}</span></div>
             <div style="font-size:10px; color:#64748b;">📍 ${ship.currentNode || ship.origin} → ${ship.nextNode || ship.destination}</div>
             <div style="font-size:10px; color:#64748b;">🛳️ ${kmTravelled} in ${daysTravelled}</div>
             ${waitReason}
             ${eventInfo}
             ${buildSegmentChain(ship)}
          </div>
        `;

    });

    contentBox.innerHTML = html;
  }
}
