// ─────────────────────────────────────────────────────────────────────────────
// ScheduleBoard — Live Flight-Board View of All Active Shipments
//
// Shows every active ship as a schedule row with:
//   • Full segment chain (port → port) with planned/actual timing
//   • Dependency indicators ("depends on Seg N completion")
//   • Current status per segment (On Time / Delayed / Port Wait / Missed etc.)
//   • Duration, wait time, total ETA
//   • Auto-refreshes every second
// ─────────────────────────────────────────────────────────────────────────────

import { PORTS } from '../data/network.js';

export class ScheduleBoard {
  constructor(container) {
    this.container = container;
    this.element   = document.createElement('div');
    this.element.className = 'dashboard-content-layer';
    this._refreshInterval = null;
  }

  mount() {
    this.container.appendChild(this.element);
    this._render();
    // Refresh every 1.5 seconds
    this._refreshInterval = setInterval(() => this._render(), 1500);
  }

  unmount() {
    if (this._refreshInterval) { clearInterval(this._refreshInterval); this._refreshInterval = null; }
    if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  _portName(id) {
    return PORTS.find(p => p.id === id)?.name || id;
  }

  _statusBadge(seg, shipStatus, idx) {
    if (seg.status === 'completed')               return { icon: '✅', label: 'On Time',       color: '#10b981' };
    if (seg.status === 'delayed')                 return { icon: '🕒', label: `+${seg.delay.toFixed(1)}d late`, color: '#fbbf24' };
    if (seg.missedConnection && seg.status !== 'moving') return { icon: '⚠️', label: 'Missed',        color: '#f43f5e' };
    if (seg.status === 'port_wait')               return { icon: '⛳', label: 'Port Wait',     color: '#a855f7' };
    if (seg.status === 'moving')                  return { icon: '🚢', label: 'Moving',        color: '#38bdf8' };
    if (seg.status === 'scheduled')               return { icon: '📅', label: 'Scheduled',     color: '#475569' };
    return                                               { icon: '📅', label: seg.status,       color: '#475569' };
  }

  _fmtDay(d) {
    if (d === null || d === undefined) return '—';
    return `Day ${d.toFixed(2)}`;
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  _render() {
    const sim = window.simulation;
    if (!sim || !sim.shipments) {
      this.element.innerHTML = '<div class="control-group"><p style="color:#64748b;font-size:12px;">Simulation not ready.</p></div>';
      return;
    }

    const ships = Array.from(sim.shipments.shipments.values())
      .filter(s => s.status !== 'completed')
      .sort((a, b) => (b.totalTimeSpent || 0) - (a.totalTimeSpent || 0))
      .slice(0, 10);

    const simDay = Array.from(sim.shipments.shipments.values())
      .filter(s => s.status !== 'completed')
      .reduce((max, s) => Math.max(max, s.totalTimeSpent || 0), 0);

    let html = `
      <div class="control-group">
        <h3 class="dash-title">🗓️ Schedule Board</h3>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <p class="panel-desc" style="margin:0;">
            <span style="color:#10b981;">${ships.length}</span> active shipment${ships.length !== 1 ? 's' : ''}
          </p>
          <span style="font-size:10px; color:#475569;">⏱️ Sim Day ${simDay.toFixed(1)}</span>
        </div>`;

    if (ships.length === 0) {
      html += `<div style="text-align:center; color:#475569; padding:30px; font-size:12px;">
        No active shipments.<br>Spawn one from the 🧪 Sandbox tab.
      </div>`;
    } else {
      html += `<div class="schedule-board-scroll">`;
      ships.forEach(ship => { html += this._renderShipCard(ship); });
      html += `</div>`;
    }

    html += '</div>';
    this.element.innerHTML = html;
  }

  // ─── Per-ship card ────────────────────────────────────────────────────────
  _renderShipCard(ship) {
    const segs      = ship.segments || [];
    const cargo     = ship.cargoEmoji || '🚢';
    const label     = ship.cargoLabel || 'General';
    const priority  = ship.priority  || 3;
    const stars     = '★'.repeat(priority) + '☆'.repeat(5 - priority);
    const totalETA  = segs.length > 0 ? segs[segs.length - 1].plannedArrival : '—';
    const predicted = ship.totalPredictedDelay > 0.1 ? `+${ship.totalPredictedDelay.toFixed(1)}d delay` : 'On schedule';
    const predColor = ship.totalPredictedDelay > 0.1 ? '#f43f5e' : '#10b981';

    const statusColor = {
      moving:    '#38bdf8', waiting: '#fbbf24', port_wait: '#a855f7',
      rerouting: '#f43f5e', completed: '#10b981'
    }[ship.status] || '#64748b';

    const shortId = ship.id.split('-').slice(-1)[0];

    let segRows = '';
    segs.forEach((seg, idx) => {
      const badge    = this._statusBadge(seg, ship.status, idx);
      const isCurr   = idx === ship.currentEdgeIndex && ship.status === 'moving';
      const isWaiting= idx === ship.currentEdgeIndex && ship.status === 'port_wait';

      // Dependency logic
      let depLabel = '';
      let depColor = '#475569';
      if (idx === 0) {
        depLabel = '🟢 FREE — First Leg';
        depColor = '#10b981';
      } else {
        const prevSeg = segs[idx - 1];
        const isDepSatisfied = prevSeg.status === 'completed' || prevSeg.status === 'delayed';
        depLabel = isDepSatisfied
          ? `✅ Seg ${idx} arrived`
          : `🔗 Awaits Seg ${idx} completion`;
        depColor = isDepSatisfied ? '#10b981' : '#fbbf24';
      }

      // Schedule wait info
      const schedWait = seg.scheduleWait && seg.scheduleWait > 0.05
        ? `<span style="color:#a855f7; font-size:9px; margin-left:6px;">⛳ +${seg.scheduleWait.toFixed(1)}d port wait</span>` : '';

      // Duration
      const duration = seg.edge ? (seg.edge.dynamic_time || seg.edge.base_time) : '—';
      const durationStr = typeof duration === 'number' ? `${duration.toFixed(1)}d` : '—';

      // Actual vs planned delta
      let arrivalInfo = '';
      if (seg.actualArrival !== null) {
        const d = (seg.actualArrival - seg.plannedArrival);
        arrivalInfo = d > 0.1
          ? `<span style="color:#f43f5e; font-size:9px;"> (+${d.toFixed(1)}d)</span>`
          : `<span style="color:#10b981; font-size:9px;"> (on time)</span>`;
      }

      const highlight = isCurr    ? 'background:rgba(56,189,248,0.06); border-left:2px solid #38bdf8;'
                      : isWaiting ? 'background:rgba(168,85,247,0.06); border-left:2px solid #a855f7;' : '';

      const segClass = isWaiting ? 'port-wait-pulse' : '';

      segRows += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04); ${highlight}">
          <td style="padding:7px 8px; white-space:nowrap;" class="${segClass}">
            <div style="font-size:11px; color:${badge.color};">${badge.icon} SEG ${idx + 1}</div>
            <div style="font-size:9px; color:#475569;">${badge.label}</div>
          </td>
          <td style="padding:7px 8px;">
            <div style="font-size:11px; color:#cbd5e1;">${this._portName(seg.from)}</div>
            <div style="font-size:9px; color:#475569;">→ ${this._portName(seg.to)}</div>
          </td>
          <td style="padding:7px 8px; font-size:10px; color:#94a3b8; white-space:nowrap;">
            <div>📤 ${this._fmtDay(seg.plannedDeparture)}</div>
            ${seg.actualDeparture !== null ? `<div style="color:#38bdf8; font-size:9px;">↳ actual: ${this._fmtDay(seg.actualDeparture)}</div>` : ''}
          </td>
          <td style="padding:7px 8px; font-size:10px; color:#94a3b8; white-space:nowrap;">
            <div>📥 ${this._fmtDay(seg.plannedArrival)}${arrivalInfo}</div>
            ${seg.actualArrival !== null ? `<div style="color:#10b981; font-size:9px;">↳ actual: ${this._fmtDay(seg.actualArrival)}</div>` : ''}
          </td>
          <td style="padding:7px 8px; font-size:10px; text-align:center; color:#64748b;">
            ⏱️ ${durationStr}${schedWait}
          </td>
          <td style="padding:7px 8px;">
            <div style="font-size:9px; color:${depColor};">${depLabel}</div>
            ${seg.missedConnection ? `<div style="font-size:9px; color:#f43f5e;">⚠️ Missed original vessel</div>` : ''}
          </td>
        </tr>`;
    });

    return `
      <div style="background:rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.07); border-radius:10px; margin-bottom:14px; overflow:hidden;">
        
        <!-- Card Header -->
        <div style="padding:10px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:18px;">${cargo}</span>
            <div>
              <div style="font-size:11px; color:#f1f5f9; font-weight:600;">${label} <span style="color:#fbbf24;">${stars}</span></div>
              <div style="font-size:10px; color:#475569;">${this._portName(ship.origin)} ⟶ ${this._portName(ship.destination)} · ID: ${shortId}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; color:${statusColor}; font-weight:700;">${ship.status.toUpperCase().replace('_', ' ')}</div>
            <div style="font-size:9px; color:${predColor};">${predicted}</div>
            <div style="font-size:9px; color:#475569;">ETA Plan: ${typeof totalETA === 'number' ? 'Day ' + totalETA.toFixed(1) : '—'}</div>
          </div>
        </div>

        <!-- Segment Table -->
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-family:inherit;">
            <thead>
              <tr style="background:rgba(0,0,0,0.3);">
                <th style="padding:5px 8px; font-size:9px; color:#475569; text-align:left; text-transform:uppercase; letter-spacing:0.5px;">Seg</th>
                <th style="padding:5px 8px; font-size:9px; color:#475569; text-align:left; text-transform:uppercase; letter-spacing:0.5px;">Route</th>
                <th style="padding:5px 8px; font-size:9px; color:#475569; text-align:left; text-transform:uppercase; letter-spacing:0.5px;">Departure</th>
                <th style="padding:5px 8px; font-size:9px; color:#475569; text-align:left; text-transform:uppercase; letter-spacing:0.5px;">Arrival</th>
                <th style="padding:5px 8px; font-size:9px; color:#475569; text-align:center; text-transform:uppercase; letter-spacing:0.5px;">Duration</th>
                <th style="padding:5px 8px; font-size:9px; color:#475569; text-align:left; text-transform:uppercase; letter-spacing:0.5px;">Dependency</th>
              </tr>
            </thead>
            <tbody>${segRows}</tbody>
          </table>
        </div>

        <!-- Summary Bar -->
        <div style="padding:8px 14px; border-top: 1px solid rgba(255,255,255,0.05); display:flex; gap:18px; flex-wrap:wrap;">
          <span style="font-size:10px; color:#64748b;">🛳️ ${Math.round(ship.totalDistanceTravelled || 0).toLocaleString()} km</span>
          <span style="font-size:10px; color:#64748b;">⏱️ ${ship.totalTimeSpent?.toFixed(1) || '0.0'}d elapsed</span>
          <span style="font-size:10px; color:#64748b;">🔁 ${ship.rerouteCount || 0} reroute${ship.rerouteCount !== 1 ? 's' : ''}</span>
          ${ship._willMissConnection ? '<span style="font-size:10px; color:#f43f5e;">⚡ Connection at risk</span>' : ''}
          ${ship.waitDaysRemaining > 0 ? `<span style="font-size:10px; color:#a855f7;">⛳ Boarding in ${ship.waitDaysRemaining.toFixed(1)}d</span>` : ''}
        </div>
      </div>`;
  }
}
