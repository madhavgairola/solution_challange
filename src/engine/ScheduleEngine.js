// ─────────────────────────────────────────────────────────────────────────────
// ScheduleEngine — Time-Based Vessel Departure Scheduling
//
// Models the REAL WORLD behavior where ships depart on fixed schedules,
// not on-demand. A given route (Port A → Port B) has vessels departing
// every N simulation days. If a cargo arrives between departures, it WAITS.
//
// This creates:
//   • Realistic port dwell time
//   • Missed connections when upstream legs run late
//   • Cascading delay propagation through the entire chain
// ─────────────────────────────────────────────────────────────────────────────

export class ScheduleEngine {
  constructor() {
    // key: "from-to", value: { frequency (sim days), offset (phase) }
    this.schedules = new Map();
    console.log('[ScheduleEngine] Initialized.');
  }

  // ─── Build departure schedules for every graph edge ───────────────────────
  // Call this ONCE after loading the route graph.
  buildSchedules(allEdges) {
    this.schedules.clear();

    allEdges.forEach(edge => {
      const key = `${edge.source}-${edge.destination}`;
      if (!this.schedules.has(key)) {
        // Frequency: a new vessel departs every ~35% of the journey time.
        // A 6-day voyage → ship every ~2.1 days.
        // Clamped to minimum 0.5 days so short hops still have a schedule.
        const frequency = Math.max(0.5, parseFloat((edge.base_time * 0.35).toFixed(2)));

        // Phase offset: randomises initial departure across routes so
        // they don't all sail at day 0 — feels much more organic.
        const offset    = parseFloat((Math.random() * frequency).toFixed(3));

        this.schedules.set(key, { frequency, offset });
      }
    });

    console.log(`[ScheduleEngine] Built ${this.schedules.size} vessel schedules across the maritime network.`);
  }

  // ─── Next available departure for route from→to, no earlier than afterDay ─
  // Returns a simulation-day value (fractional days since simulation start).
  getNextDeparture(from, to, afterDay) {
    const key   = `${from}-${to}`;
    const sched = this.schedules.get(key);

    if (!sched) {
      // Unknown route — no schedule constraint, departs immediately.
      return afterDay;
    }

    const { frequency, offset } = sched;

    // Departure series: offset, offset+freq, offset+2*freq, …
    if (afterDay <= offset) return parseFloat(offset.toFixed(3));

    const n = Math.ceil((afterDay - offset) / frequency);
    return parseFloat((offset + n * frequency).toFixed(3));
  }

  // ─── How long (simulation days) must cargo wait at the port? ──────────────
  getWaitTime(from, to, arrivalDay) {
    const dep = this.getNextDeparture(from, to, arrivalDay);
    return Math.max(0, dep - arrivalDay);
  }

  // ─── Human-readable schedule summary ──────────────────────────────────────
  getScheduleSummary(from, to) {
    const key   = `${from}-${to}`;
    const sched = this.schedules.get(key);
    if (!sched) return null;
    return {
      route:        `${from} → ${to}`,
      frequencyDays: sched.frequency,
      phaseOffset:   sched.offset
    };
  }
}
