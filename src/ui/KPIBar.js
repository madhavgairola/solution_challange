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
      class="glass-panel" 
      style="
        padding: 6px 14px; 
        display: flex; 
        align-items: center; 
        gap: 8px; 
        border-radius: 999px;
      "
    `;

    this.el.innerHTML = `
      <div ${basePill}>
        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Active</span>
        <span style="font-size:13px; color:var(--text-primary); font-weight:600;"><span style="color:var(--info); margin-right:4px;">🚢</span>${activeShips}</span>
      </div>
      
      <div ${basePill}>
        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Handled</span>
        <span style="font-size:13px; color:var(--text-primary); font-weight:600;"><span style="color:var(--danger); margin-right:4px;">🚨</span>${avoided}</span>
      </div>
      
      <div ${basePill}>
        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Reroutes</span>
        <span style="font-size:13px; color:var(--text-primary); font-weight:600;"><span style="color:var(--accent); margin-right:4px;">🔁</span>${countReroutes}</span>
      </div>
      
      <div class="glass-panel" style="
        padding: 6px 14px; 
        display: flex; 
        align-items: center; 
        gap: 8px; 
        border-radius: 999px;
        background: var(--accent-soft);
        border: 1px solid var(--accent-glow);
      ">
        <span style="font-size:10px; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">Delay Saved</span>
        <span style="font-size:13px; color:var(--text-primary); font-weight:600;">${daysSaved.toFixed(1)}d</span>
      </div>
    `;
  }
}
