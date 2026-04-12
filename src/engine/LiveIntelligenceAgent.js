import { PORTS } from '../data/network.js';

const DISRUPTION_TEMPLATES = [
  { severity: 'warning', radius: 400000, desc: 'Category 3 Hurricane / Typhoon forming in region.' },
  { severity: 'critical', radius: 250000, desc: 'Piracy activity surge threatening nearby maritime traffic.' },
  { severity: 'warning', radius: 500000, desc: 'Massive port congestion delaying global supply chain vessels.' },
  { severity: 'critical', radius: 300000, desc: 'Labor strike causing near-total operational halt at major hub.' },
  { severity: 'blocked', radius: 150000, desc: 'Geopolitical military escalation triggering an absolute blockade.' },
  { severity: 'blocked', radius: 100000, desc: 'Catastrophic vessel grounding locking down strategic sea channel.' }
];

export class LiveIntelligenceAgent {
  constructor(eventEngine) {
    this.eventEngine = eventEngine;
    this.isActive = false;
    this.pollingInterval = null;
    this.eventCount = 0;
    
    // UI binding for the terminal feed
    this.onLogCallback = null;
  }

  setLogCallback(cb) {
    this.onLogCallback = cb;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    
    this._log("🌍 LIVE RELAY INITIATED: Listening to Global APIs...");

    // Fire immediately then poll
    setTimeout(() => this._pollData(), 1500);
    
    // Poll every ~8 seconds for demo pacing
    this.pollingInterval = setInterval(() => {
       this._pollData();
    }, 8000);
  }

  stop() {
    this.isActive = false;
    clearInterval(this.pollingInterval);
    this.eventEngine.activeEvents.clear(); // Clear board safely? Actually just let eventEngine._recalculate but proper explicit clearing:
    
    const ids = Array.from(this.eventEngine.activeEvents.keys());
    ids.forEach(id => {
       if (id.startsWith('irl_')) {
          this.eventEngine.clearEvent(id);
       }
    });

    this._log("🛑 INTELLIGENCE FEED OFFLINE.");
  }

  _pollData() {
    // 60% chance to generate a disruption
    if (Math.random() > 0.60) {
       this._log("📡 SYNC: No significant real-time disruptions detected.");
       return;
    }

    // Pick a random port as a geographic anchor focus point
    const targetPort = PORTS[Math.floor(Math.random() * PORTS.length)];
    const template = DISRUPTION_TEMPLATES[Math.floor(Math.random() * DISRUPTION_TEMPLATES.length)];

    // Slight randomization of geometry anchor off the port to make it feel realistic (ocean drift)
    const driftLat = (Math.random() - 0.5) * 5;
    const driftLng = (Math.random() - 0.5) * 5;
    const anchor = { lat: targetPort.lat + driftLat, lng: targetPort.lng + driftLng };

    this.eventCount++;
    const eventId = `irl_event_${this.eventCount}`;

    this._log(`⚠️ ALERT [${template.severity.toUpperCase()}]: ${template.desc} (Focus: ${targetPort.name} Sector)`);
    
    this.eventEngine.injectGeometricEvent(
       eventId, 
       anchor, 
       template.radius, 
       template.severity, 
       `API: ${template.desc}`
    );

    // Auto-resolve older IRL events to prevent map clutter (keep max 3 alive)
    const aliveIRL = Array.from(this.eventEngine.activeEvents.keys()).filter(id => id.startsWith('irl_'));
    if (aliveIRL.length > 3) {
       const oldestId = aliveIRL[0];
       this.eventEngine.clearEvent(oldestId);
       this._log(`✅ RESOLVED: Crisis in sector ${oldestId} has officially stabilized.`);
    }
  }

  _log(msg) {
    if (this.onLogCallback) {
      this.onLogCallback(`[${new Date().toLocaleTimeString()}] ${msg}`);
    }
  }
}
