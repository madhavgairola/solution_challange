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
    this.el = document.getElementById('kpi-mount');
    if (!this.el) return;
    this.el.style.display = 'flex';
    this.el.style.gap = '8px';
    this._refresh();
  }

  _refresh() {
    if (!this.el) return;
    const activeShips = window.simulation?.shipments?.shipments?.size || 0;
    const stats       = this.engine?.stats || {};
    
    const countAlerts   = stats.totalAlerts || 0;
    const countReroutes = stats.totalReroutes || 0;
    const avoided       = stats.blockagesDetected > 0 ? stats.blockagesDetected : 0;
    const daysSaved     = stats.totalDaysSaved || 0;

    const basePill = `
      style="
        padding: 4px 12px; 
        display: flex; 
        align-items: center; 
        gap: 8px; 
        border-radius: 6px;
        background: var(--bg-secondary);
        border: 1px solid var(--glass-border);
      "
    `;

    this.el.innerHTML = `
      <div ${basePill}>
        <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Active Fleet</span>
        <span style="font-size:12px; color:var(--text-primary); font-weight:600;">${activeShips}</span>
      </div>
      
      <div ${basePill}>
        <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Detected Anomalies</span>
        <span style="font-size:12px; color:var(--text-primary); font-weight:600;">${avoided}</span>
      </div>
      
      <div ${basePill}>
        <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">System Reroutes</span>
        <span style="font-size:12px; color:var(--text-primary); font-weight:600;">${countReroutes}</span>
      </div>
      
      <div style="
        padding: 4px 12px; 
        display: flex; 
        align-items: center; 
        gap: 8px; 
        border-radius: 6px;
        background: rgba(62,207,142,0.1);
        border: 1px solid rgba(62,207,142,0.2);
      ">
        <span style="font-size:10px; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">Global Days Saved</span>
        <span style="font-size:12px; color:var(--text-primary); font-weight:600;">${daysSaved.toFixed(1)}d</span>
      </div>
    `;
  }
}
