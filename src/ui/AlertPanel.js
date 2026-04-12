// ─────────────────────────────────────────────────────────────────────────────
// AlertPanel — Floating top-right Alert Feed
//
// Subscribes to AlertEngine. Renders a Bloomberg-terminal-style live feed
// of all intelligence events: blockages, risk predictions, reroutes, cascades.
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CFG = {
  blockage:          { icon: '🚨', color: '#f43f5e', label: 'BLOCKAGE'  },
  risk:              { icon: '⚠️', color: '#fbbf24', label: 'RISK'      },
  cascade:           { icon: '⚡', color: '#fb923c', label: 'CASCADE'   },
  reroute:           { icon: '🔁', color: '#38bdf8', label: 'REROUTED'  },
  missed_connection: { icon: '❌', color: '#f97316', label: 'MISSED'    },
  resolved:          { icon: '✅', color: '#10b981', label: 'RESOLVED'  },
  info:              { icon: 'ℹ️',  color: '#64748b', label: 'INFO'      },
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
      top:            '110px',
      right:          '16px',
      width:          '305px',
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
      const extra   = a.details?.savedDays > 0.05
        ? `<div style="color:#10b981;font-size:10px;margin-top:2px;">💾 Saved ${a.details.savedDays.toFixed(1)}d</div>`
        : a.details?.delayDays > 0.05
          ? `<div style="color:#fbbf24;font-size:10px;margin-top:2px;">+${a.details.delayDays.toFixed(1)}d delay predicted</div>`
          : '';

      const reasonLine = a.details?.trigger
        ? `<div style="font-size:9px;color:#475569;margin-top:2px;font-style:italic;">${a.details.trigger}</div>`
        : '';

      return `
        <div style="
          background:rgba(15,23,42,0.95);
          border:1px solid ${cfg.color}33;
          border-left:3px solid ${cfg.color};
          border-radius:7px;
          padding:8px 10px;
          margin-bottom:4px;
        ">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="display:flex;align-items:center;gap:5px;">
              <span style="font-size:13px;">${cfg.icon}</span>
              <span style="font-size:9px;color:${cfg.color};font-weight:700;letter-spacing:0.5px;">${cfg.label}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:9px;color:#334155;">${simDay}</span>
              <span data-dismiss="${a.id}" style="color:#475569;cursor:pointer;font-size:13px;line-height:1;padding:0 2px;">×</span>
            </div>
          </div>
          <div style="font-size:11px;color:#cbd5e1;margin-top:3px;line-height:1.5;">${a.message}</div>
          ${extra}${reasonLine}
        </div>`;
    }).join('');

    const emptyState = `
      <div style="text-align:center;color:#334155;font-size:11px;padding:18px 8px;">
        🛡️ All clear — no active alerts
      </div>`;

    this.el.innerHTML = `
      <div style="
        background:rgba(15,23,42,0.82);
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
        border:1px solid rgba(255,255,255,0.08);
        border-radius:10px;
        overflow:hidden;
        box-shadow:0 8px 32px rgba(0,0,0,0.5);
      ">
        <!-- Header -->
        <div id="alert-toggle" style="
          padding:8px 12px;
          display:flex;justify-content:space-between;align-items:center;
          border-bottom:1px solid rgba(255,255,255,0.06);
          cursor:pointer;user-select:none;
        ">
          <div style="display:flex;align-items:center;">
            <span style="font-size:12px;color:#f1f5f9;font-weight:600;">⚡ Alert Feed</span>
            ${badge}
          </div>
          <span style="font-size:10px;color:#475569;">${this.collapsed ? '▼ Show' : '▲ Hide'}</span>
        </div>

        ${!this.collapsed ? `
        <div style="
          max-height:46vh;overflow-y:auto;padding:7px;
          scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent;
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
