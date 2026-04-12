// ─────────────────────────────────────────────────────────────────────────────
// AlertEngine — Global Intelligence Alert Bus
//
// Emits structured alerts from any engine (ShipmentEngine, EventEngine).
// Consumers (AlertPanel, KPI bar) subscribe via onAlert().
// Has cooldowns per-key to prevent spam.
// ─────────────────────────────────────────────────────────────────────────────

export class AlertEngine {
  constructor() {
    this.alerts     = [];
    this.maxAlerts  = 100;
    this._listeners = [];
    this._cooldowns = new Map(); // cooldownKey → last emit timestamp

    // Accumulated KPI stats
    this.stats = {
      totalAlerts:       0,
      totalReroutes:     0,
      totalDaysSaved:    0,
      blockagesDetected: 0,
      cascadesDetected:  0,
    };
  }

  // ── Cooldown guard ─────────────────────────────────────────────────────────
  _canEmit(key, minMs = 8000) {
    if (!key) return true;
    const last = this._cooldowns.get(key) || 0;
    if (Date.now() - last < minMs) return false;
    this._cooldowns.set(key, Date.now());
    return true;
  }

  // ── Emit an alert ──────────────────────────────────────────────────────────
  // type:     'risk' | 'blockage' | 'reroute' | 'cascade' | 'resolved' | 'info'
  // severity: 'info' | 'warning' | 'critical' | 'success'
  // details:  { shipId, savedDays, delayDays, newRoute, oldRoute, trigger }
  emit(type, severity, message, details = {}, cooldownKey = null) {
    if (!this._canEmit(cooldownKey, details.cooldownMs || 8000)) return null;

    const alert = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type, severity, message, details,
      simDay:    window.simulationElapsedDays || 0,
      timestamp: Date.now(),
      dismissed: false,
    };

    this.alerts.unshift(alert);
    if (this.alerts.length > this.maxAlerts) this.alerts.pop();

    // Accumulate stats
    this.stats.totalAlerts++;
    if (type === 'blockage')                              this.stats.blockagesDetected++;
    if (type === 'cascade')                               this.stats.cascadesDetected++;
    if (type === 'reroute' && (details.savedDays || 0) > 0) {
      this.stats.totalReroutes++;
      this.stats.totalDaysSaved += details.savedDays;
    }

    this._listeners.forEach(fn => fn(alert));
    return alert;
  }

  dismiss(id) {
    const a = this.alerts.find(x => x.id === id);
    if (a) { a.dismissed = true; this._listeners.forEach(fn => fn(null)); }
  }

  onAlert(fn) { this._listeners.push(fn); }

  getActive(limit = 15) {
    return this.alerts.filter(a => !a.dismissed).slice(0, limit);
  }

  getAll(limit = 80) {
    return this.alerts.slice(0, limit);
  }
}
