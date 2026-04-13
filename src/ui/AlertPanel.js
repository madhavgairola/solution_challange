// ─────────────────────────────────────────────────────────────────────────────
// AlertPanel — Floating top-right Alert Feed
//
// Subscribes to AlertEngine. Renders a Bloomberg-terminal-style live feed
// of all intelligence events: blockages, risk predictions, reroutes, cascades.
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CFG = {
  blockage:          { color: '#f43f5e', label: 'BLOCKAGE'  },
  risk:              { color: '#fbbf24', label: 'RISK'      },
  cascade:           { color: '#fb923c', label: 'CASCADE'   },
  reroute:           { color: '#38bdf8', label: 'REROUTED'  },
  missed_connection: { color: '#f97316', label: 'MISSED'    },
  resolved:          { color: '#10b981', label: 'RESOLVED'  },
  info:              { color: '#64748b', label: 'INFO'      },
  decision:          { color: '#a855f7', label: 'DECISION'  },
};

export class AlertPanel {
  constructor(alertEngine) {
    this.engine    = alertEngine;
    this.collapsed = false;
    this._build();
    alertEngine.onAlert(() => this._refresh());
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'alert-panel';
    Object.assign(this.el.style, {
      position:       'fixed',
      bottom:         '16px',
      left:           '50%',
      transform:      'translateX(-50%)',
      width:          '440px',
      zIndex:         '3000',
      fontFamily:     "'Inter', Roboto, sans-serif",
      pointerEvents:  'all',
    });
    document.body.appendChild(this.el);
    this._refresh();
  }

  _refresh() {
    const alerts = this.engine.getActive(12);
    const count  = alerts.length;

    const badge = count > 0
      ? `<span style="background:#f43f5e;color:white;font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px;margin-left:5px;">${count}</span>`
      : '';

    const cards = alerts.map(a => {
      const cfg     = TYPE_CFG[a.type] || TYPE_CFG.info;
      const simDay  = typeof a.simDay === 'number' ? `Day ${a.simDay.toFixed(1)}` : '';
      
      let extra   = a.details?.savedDays > 0.05
        ? `<div style="color:#10b981;font-size:10px;margin-top:4px;">+ Saved ${a.details.savedDays.toFixed(1)}d</div>`
        : a.details?.delayDays > 0.05
          ? `<div style="color:#fbbf24;font-size:10px;margin-top:4px;">- Predicted ${a.details.delayDays.toFixed(1)}d delay</div>`
          : '';

      const reasonLine = a.details?.trigger
        ? `<div style="font-size:9px;color:var(--text-muted);margin-top:2px;">[CAUSE: ${a.details.trigger.toUpperCase()}]</div>`
        : '';

      if (a.type === 'decision' && a.details) {
         extra = `
         <div style="background:var(--bg-primary); border:1px solid var(--glass-border); border-radius:4px; padding:6px; margin-top:6px;">
            <div style="font-size:9px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase; font-weight:600;">Options Evaluated:</div>
            <ul style="margin:0; padding-left:14px; font-size:10px; color:#e2e8f0; line-height:1.4;">
               <li>Go Through: ${a.details.throughTime === Infinity ? 'Blocked (Cross-Infinity)' : `${a.details.throughTime.toFixed(1)}d total time`}</li>
               <li>Go Around: ${a.details.aroundTime === Infinity ? 'Unviable/Blocked' : `${a.details.aroundTime.toFixed(1)}d total time`}</li>
               <li>Wait: ${a.details.waitTime === Infinity ? 'Indefinite' : `${a.details.waitTime.toFixed(1)}d total time`}</li>
            </ul>
            <div style="margin-top:6px; font-size:10px;">
               <span style="color:#10b981; font-weight:600;">SELECTED: ${a.details.decision.toUpperCase()}</span>
            </div>
            <div style="margin-top:2px; font-size:9px; color:var(--text-muted);">
               ${a.details.reason}
            </div>
         </div>
         ${a.details.savedTime ? `<div style="color:#10b981;font-size:10px;margin-top:4px;font-weight:600;">Action vs Baseline: Saved ${a.details.savedTime.toFixed(1)} days</div>` : ''}
         `;
      }

      return `
        <div class="alert-card" style="
          background: var(--bg-secondary);
          border: 1px solid var(--glass-border);
          border-left: 3px solid ${cfg.color};
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 6px;
          transition: transform 0.15s ease;
          animation: slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        " onmouseover="this.style.transform='translateX(-2px)'" onmouseout="this.style.transform='none'">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="width:6px; height:6px; border-radius:50%; background:${cfg.color}; box-shadow: 0 0 6px ${cfg.color};"></div>
              <span style="font-size:10px;color:var(--text-primary);font-weight:600;letter-spacing:0.5px;">${cfg.label}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:10px;color:var(--text-muted);">${simDay}</span>
              <span data-dismiss="${a.id}" style="color:var(--text-muted);cursor:pointer;font-size:14px;line-height:1;padding:0 2px;">&times;</span>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-primary);margin-top:4px;line-height:1.5;">${a.message}</div>
          ${extra}${reasonLine}
        </div>`;
    }).join('');

    const emptyState = `
      <div style="text-align:center;color:var(--text-muted);font-size:11px;padding:24px 8px;">
        System Nominal. Awaiting Events.
      </div>`;

    this.el.innerHTML = `
      <div class="glass-panel" style="
        border-radius: 8px;
        overflow: hidden;
        background: var(--bg-primary);
      ">
        <!-- Header -->
        <div id="alert-toggle" style="
          padding: 8px 12px;
          display: flex; justify-content: space-between; align-items: center;
          border-bottom: 1px solid var(--glass-border);
          cursor: pointer; user-select: none;
          background: var(--bg-secondary);
        ">
          <div style="display:flex;align-items:center;">
            <div style="width:4px; height:4px; border-radius:50%; background:var(--accent); margin-right:6px; box-shadow: 0 0 4px var(--accent);"></div>
            <span style="font-size:11px;color:var(--text-primary);font-weight:600;letter-spacing:0.5px;">INTELLIGENCE FEED</span>
            ${badge}
          </div>
          <span style="font-size:10px;color:var(--text-muted);">${this.collapsed ? '▼ SHOW' : '▲ HIDE'}</span>
        </div>

        ${!this.collapsed ? `
        <div style="
          max-height: 50vh; overflow-y: auto; padding: 10px;
          scrollbar-width: thin; scrollbar-color: var(--glass-border) transparent;
        ">
          ${count === 0 ? emptyState : cards}
        </div>` : ''}
      </div>`;

    // Bind collapse
    this.el.querySelector('#alert-toggle')?.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      this._refresh();
    });

    // Bind dismiss
    this.el.querySelectorAll('[data-dismiss]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.engine.dismiss(btn.dataset.dismiss);
      });
    });
  }
}
