// ─────────────────────────────────────────────────────────────────────────────
// KPIBar — Top-center metrics bar
//
// Shows Active Ships, Disruptions, Reroutes, Avg Delay Saved.
// Subscribes to AlertEngine for aggregated statistics.
// ─────────────────────────────────────────────────────────────────────────────

export class KPIBar {
  constructor(alertEngine) {
    this.engine = alertEngine;
    this._build();
    
    // Refresh loop to capture active ships and evolving stats
    setInterval(() => this._refresh(), 1000);
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'kpi-bar';
    Object.assign(this.el.style, {
      position:       'fixed',
      top:            '58px', // just under the clock
      left:           '50%',
      transform:      'translateX(-50%)',
      zIndex:         '2000',
      background:     'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      border:         '1px solid rgba(255,255,255,0.08)',
      borderRadius:   '8px',
      padding:        '6px 16px',
      display:        'flex',
      alignItems:     'center',
      gap:            '20px',
      fontFamily:     "'Inter', Roboto, sans-serif",
      pointerEvents:  'none',
      boxShadow:      '0 4px 16px rgba(0,0,0,0.4)',
    });
    document.body.appendChild(this.el);
    this._refresh();
  }

  _refresh() {
    const activeShips = window.simulation?.shipments?.shipments?.size || 0;
    const stats       = this.engine?.stats || {};
    
    const countAlerts   = stats.totalAlerts || 0;
    const countReroutes = stats.totalReroutes || 0;
    const avoided       = stats.blockagesDetected > 0 ? stats.blockagesDetected : 0;
    const daysSaved     = stats.totalDaysSaved || 0;

    this.el.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Active Agents</div>
        <div style="font-size:13px;color:#e2e8f0;font-weight:600;"><span style="color:#38bdf8;margin-right:4px;">🚢</span>${activeShips}</div>
      </div>
      <div style="width:1px;height:24px;background:rgba(255,255,255,0.1);"></div>
      
      <div style="text-align:center;">
        <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Disruptions Handled</div>
        <div style="font-size:13px;color:#e2e8f0;font-weight:600;"><span style="color:#f43f5e;margin-right:4px;">🚨</span>${avoided}</div>
      </div>
      <div style="width:1px;height:24px;background:rgba(255,255,255,0.1);"></div>
      
      <div style="text-align:center;">
        <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Autonomous Reroutes</div>
        <div style="font-size:13px;color:#e2e8f0;font-weight:600;"><span style="color:#3ecf8e;margin-right:4px;">🔁</span>${countReroutes}</div>
      </div>
      <div style="width:1px;height:24px;background:rgba(255,255,255,0.1);"></div>
      
      <div style="text-align:center;">
        <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Total Delay Saved</div>
        <div style="font-size:13px;color:#e2e8f0;font-weight:600;"><span style="color:#fbbf24;margin-right:4px;">⏱️</span>${daysSaved.toFixed(1)} Days</div>
      </div>
    `;
  }
}
