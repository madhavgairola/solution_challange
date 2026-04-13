import { PORTS } from '../data/network.js';

export class TelemetryPanel {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'telemetry-panel';
    
    // Set position and styling here for the container to stay at bottom.
    Object.assign(this.container.style, {
      position: 'fixed',
      bottom: '12px',
      left: '12px',
      right: '12px',
      height: '140px',
      zIndex: '1500',
      display: 'flex',
      gap: '12px',
      padding: '4px',
      overflowX: 'auto',
      overflowY: 'hidden',
      pointerEvents: 'all',
      scrollbarWidth: 'none', // hide scrollbar Firefox
    });
    // hide scrollbar Webkit hack will be in css
    
    document.body.appendChild(this.container);

    this.lastRenderTime = 0;
    this.render();
  }

  render() {
    // We remove the old header and just use the box for cards
    this.container.innerHTML = `
         <div style="color: var(--text-muted); font-size: 11px; padding: 20px; width: 100%; text-align: center;">
           Awaiting Agent Deployments...
         </div>
    `;
  }

  // Called natively from ShipmentEngine on 60FPS loop, but throttled locally to prevent DOM melting
  update(shipments) {
    if (Date.now() - this.lastRenderTime < 300) return; // 300ms UI throttler
    this.lastRenderTime = Date.now();

    // Remove old header lookup, we write directly to container
    if (!shipments || shipments.length === 0) {
        this.container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; width: 100%; text-align: center; margin-top:20px;">Fleet Idle. Awaiting Deployments...</div>';
        return;
    }

    let html = '';
    const priorityStars = (p) => '★'.repeat(p) + '☆'.repeat(5 - p);

    const buildSegmentChain = (ship) => {
      if (!ship.segments || ship.segments.length === 0) return '';
      const preds = ship.segmentPredictions || [];
      const predMap = new Map(preds.map(p => [p.from + '-' + p.to, p]));

      const badges = ship.segments.map((seg, idx) => {
        const isCompleted = seg.status === 'completed' || seg.status === 'delayed';
        const isCurrent   = idx === ship.currentEdgeIndex && ship.status === 'moving';
        const pred        = predMap.get(seg.from + '-' + seg.to);

        let dotColor = 'var(--text-muted)'; let delayText = '';

        if (isCompleted) {
          const d = seg.delay;
          if (seg.missedConnection) { dotColor = 'var(--danger)'; delayText = `+${d.toFixed(1)}d`; }
          else if (d > 0.1)         { dotColor = 'var(--warning)'; delayText = `+${d.toFixed(1)}d`; }
          else                      { dotColor = 'var(--accent)'; }
        } else if (seg.status === 'port_wait') {
          dotColor = 'var(--info)';
          if (pred && pred.scheduleWait > 0.05) delayText = `${pred.scheduleWait.toFixed(1)}d`;
        } else if (isCurrent) {
          dotColor = 'var(--info)';
          if (pred && pred.predictedDelay > 0.1) delayText = `~+${pred.predictedDelay.toFixed(1)}d`;
        } else if (pred) {
          if (pred.willMissConnection) { dotColor = '#f97316'; delayText = `~+${pred.predictedDelay.toFixed(1)}d`; }
          else if (pred.predictedDelay > 0.1) { dotColor = 'var(--warning)'; delayText = `~+${pred.predictedDelay.toFixed(1)}d`; }
        }

        return `<div title="${seg.from}→${seg.to}" style="display:flex;align-items:center;gap:4px;color:var(--text-muted);font-size:9px;white-space:nowrap;"><div style="width:4px;height:4px;border-radius:50%;background:${dotColor};"></div>${delayText ? '<span style="font-size:8px;">'+delayText+'</span>' : ''}</div>`;
      });

      return `
        <div style="margin-top:8px; border-top: 1px solid var(--glass-border); padding-top:6px;">
          <div style="display:flex; align-items:center; gap:3px; flex-wrap:nowrap; overflow:hidden;">
            ${badges.join('<span style="color:var(--text-muted); font-size:8px; display:inline-block; margin: 0 2px;">•</span>')}
          </div>
        </div>`;
    };
    

    // Show up to 16 active ships horizontally
    shipments.slice(-16).forEach(ship => {
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
          <div class="glass-panel" style="
            min-width: 240px; 
            max-width: 240px;
            padding: 12px; 
            background: var(--bg-secondary);
            border: 1px solid var(--glass-border);
            border-top: 3px solid ${statusColor};
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            cursor: pointer;
            transition: transform 0.15s ease;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
             <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 6px;">
                <div style="font-size:12px; font-weight:600; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                  <div style="width:6px; height:6px; border-radius:50%; background:${statusColor}; box-shadow: 0 0 6px ${statusColor};"></div>
                  ${ship.id}
                </div>
                <div style="font-size:9px; font-weight:600; color:var(--text-muted); letter-spacing:0.5px;">${displayStatus}</div>
             </div>
             
             <div style="font-size:10px; color:var(--text-secondary); margin-bottom:8px; line-height: 1.4;">
                ${originName} <span style="color:var(--text-muted)">→</span> ${destName}
             </div>
             
             <div style="font-size:10px; color:var(--text-primary); display:flex; justify-content:space-between; margin-bottom:4px;">
               <span style="color:var(--text-muted);">Health:</span>
               <span style="color:${healthColor}; font-weight:500;">${healthText}</span>
             </div>
             <div style="font-size:10px; color:var(--text-primary); display:flex; justify-content:space-between; margin-bottom:2px;">
               <span style="color:var(--text-muted);">Delay:</span>
               <span style="color:${delayColor}; font-weight:500;">${delayVal}</span>
             </div>
             
             ${buildSegmentChain(ship)}
          </div>
        `;
    });

    this.container.innerHTML = html;
  }
}
