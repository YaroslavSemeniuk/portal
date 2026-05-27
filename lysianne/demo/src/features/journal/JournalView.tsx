import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sim } from '../../lib/sim';
import { getState, setState } from '../../lib/store';
import { fmt, formatDate, pnlClass, signedFmt, winRate } from '../../lib/format';
import { isDailyLossBlocked } from '../../lib/riskMetrics';
import type { JournalEntry } from '../../lib/types';
import { useGKState } from '../../hooks/useGKState';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { PairIcon } from '../../components/ui/PairIcon';

type Filter = 'all' | 'wins' | 'losses';

function EditableField({
  label,
  id,
  field,
  value,
  placeholder,
  multiline,
}: {
  label: string;
  id: string;
  field: keyof Pick<JournalEntry, 'emotion' | 'setup' | 'tags' | 'notes'>;
  value: string;
  placeholder: string;
  multiline?: boolean;
}): React.ReactElement {
  const cls = multiline ? 'textarea-pill' : 'input-pill';
  return (
    <div className="journal-editable-row">
      <span className="l">{label}</span>
      <span
        className={cls}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onBlur={(e) => {
          const text = e.currentTarget.textContent?.trim() ?? '';
          const cur = getState();
          const jr = cur.journal.map((r) => (r.id === id ? { ...r, [field]: text } : r));
          setState({ journal: jr });
        }}
      >
        {value}
      </span>
    </div>
  );
}

function JournalCard({ r, balance }: { r: JournalEntry; balance: number }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const inst = Sim.getMeta(r.symbol);
  const decimals = inst?.decimals ?? 5;
  const pip = inst?.pip ?? 0.0001;
  const iconClass = inst?.iconClass ?? 'eur';
  const short = inst?.short ?? '?';
  const slPips = Math.abs(r.entry - r.sl) / pip;
  const tpPips = Math.abs(r.tp - r.entry) / pip;
  const riskPct = balance > 0 ? (r.riskUsd / balance) * 100 : 0;

  return (
    <div className="journal-card">
      <div
        className="journal-card-head"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle()}
      >
        <div className="journal-id-block">
          <PairIcon iconClass={iconClass} label={short} />
          <div>
            <div className="journal-id">
              {r.id} · {r.symbol} {r.direction.charAt(0).toUpperCase()}
              {r.direction.slice(1)}
            </div>
            <div className="journal-date">{new Date(r.ts).toLocaleString()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className={`tag ${r.outcome === 'win' ? 'win' : r.outcome === 'pending' ? 'primary' : 'loss'}`}>
            {r.outcome === 'pending' ? 'PENDING' : r.outcome.toUpperCase()}
          </span>
          <div className={`journal-pnl ${r.outcome === 'pending' ? '' : r.pnl >= 0 ? 'up' : 'down'}`}>
            {r.outcome === 'pending' ? '—' : signedFmt(r.pnl, 2)}
          </div>
          <svg className={`journal-chev ${open ? 'open' : ''}`} viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {open ? (
        <div className="journal-card-body">
          <div className="journal-grid">
            <div className="journal-row">
              <span className="l">Entry</span>
              <span className="v">{r.entry.toFixed(decimals)}</span>
            </div>
            <div className="journal-row">
              <span className="l">Exit</span>
              <span className="v">{r.exit.toFixed(decimals)}</span>
            </div>
            <div className="journal-row">
              <span className="l">Direction</span>
              <span className="v">{r.direction === 'long' ? 'Long ↗' : 'Short ↘'}</span>
            </div>
            <div className="journal-row">
              <span className="l">P&amp;L</span>
              <span className={`v ${r.pnl >= 0 ? 'success' : 'danger'}`}>{signedFmt(r.pnl, 2)}</span>
            </div>
            <div className="journal-row">
              <span className="l">Size</span>
              <span className="v">{fmt(r.riskUsd > 0 ? Math.round(r.riskUsd * 5) : 0, 0)} units</span>
            </div>
            <div className="journal-row">
              <span className="l">Risk</span>
              <span className="v">
                ${fmt(r.riskUsd, 0)} ({riskPct.toFixed(1)}%)
              </span>
            </div>
            <div className="journal-row">
              <span className="l">SL</span>
              <span className="v">
                {r.sl.toFixed(decimals)} · {slPips.toFixed(0)} pips
              </span>
            </div>
            <div className="journal-row">
              <span className="l">TP</span>
              <span className="v">
                {r.tp.toFixed(decimals)} · {tpPips.toFixed(0)} pips
              </span>
            </div>
            <div className="journal-row">
              <span className="l">Actual R:R</span>
              <span className="v">{r.rr > 0 ? `1 : ${r.rr.toFixed(2)}` : r.rr.toFixed(2)}</span>
            </div>
            <div className="journal-row">
              <span className="l">Duration</span>
              <span className="v">
                {r.durationMin >= 60 ? `${Math.floor(r.durationMin / 60)}h ${r.durationMin % 60}m` : `${r.durationMin}m`}
              </span>
            </div>
            <div className="journal-row">
              <span className="l">Slippage</span>
              <span className="v">{r.slippage > 0 ? `+${r.slippage.toFixed(2)} pips` : '0 pips'}</span>
            </div>
            <div className="journal-row">
              <span className="l">Rules</span>
              <span className="v">8 / 8 ✓</span>
            </div>
          </div>

          <div className="journal-divider" />

          <div className="journal-editable">
            <EditableField label="Emotion" id={r.id} field="emotion" value={r.emotion ?? ''} placeholder="How did you feel during this trade?" />
            <EditableField label="Setup" id={r.id} field="setup" value={r.setup ?? ''} placeholder="What was the trade idea?" />
            <EditableField label="Tags" id={r.id} field="tags" value={r.tags ?? ''} placeholder="Comma-separated tags..." />
            <EditableField label="Notes" id={r.id} field="notes" value={r.notes ?? ''} placeholder="Reflections, lessons learned..." multiline />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function JournalView(): React.ReactElement {
  const st = useGKState();
  const [filter, setFilter] = useState<Filter>('all');
  const [infoHidden, setInfoHidden] = useState(false);

  const rows = useMemo(() => {
    let list = st.journal.slice().reverse();
    if (filter === 'wins') list = list.filter((r) => r.outcome === 'win');
    if (filter === 'losses') list = list.filter((r) => r.outcome === 'loss');
    return list;
  }, [st.journal, filter]);

  const totalPnl = st.journal.reduce((s, r) => s + (r.outcome === 'pending' ? 0 : r.pnl), 0);
  const settled = st.journal.filter((r) => r.outcome !== 'pending');
  const avgRr = settled.length > 0 ? settled.reduce((s, r) => s + Math.abs(r.rr), 0) / settled.length : 0;

  return (
    <section className="view">
      <div className="frame">
        <Sidebar active="journal" />
        <Topbar />
        <main className="main">
          <div className="page-head">
            <div>
              <div className="page-title">Trade journal</div>
              <div className="page-sub">Review and annotate your trades.</div>
            </div>
            <div className="page-date mono">{formatDate()}</div>
          </div>

          {!infoHidden ? (
            <div className="journal-info">
              <div className="journal-info-ic">i</div>
              <span>Every trade is auto-logged. Add your notes, tags and emotional state to improve your edge over time.</span>
              <span className="dismiss" role="button" tabIndex={0} onClick={() => setInfoHidden(true)} onKeyDown={(e) => e.key === 'Enter' && setInfoHidden(true)}>
                ×
              </span>
            </div>
          ) : null}

          <div className="journal-filters">
            {(['all', 'wins', 'losses'] as const).map((f) => {
              const count =
                f === 'all' ? st.journal.length : st.journal.filter((r) => r.outcome === (f === 'wins' ? 'win' : 'loss')).length;
              return (
                <button key={f} type="button" className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)} · {count}
                </button>
              );
            })}
          </div>

          {rows.length ? (
            rows.map((r) => <JournalCard key={r.id} r={r} balance={st.balance} />)
          ) : (
            <div className="empty">
              <div className="empty-illu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M4 9h16M9 4v16" />
                </svg>
              </div>
              <div className="empty-title">No trades match this filter.</div>
            </div>
          )}
        </main>

        <aside className="orderpanel">
          <div className="op-head">
            <div className="op-title">Journal stats</div>
            <div className="op-step">{st.journal.length} total</div>
          </div>
          <div className="op-section">
            <div className="op-section-label">Performance</div>
            <div className="op-kpi-list">
              <div className="op-kpi">
                <span className="op-kpi-l">Total P&amp;L</span>
                <span className={`op-kpi-v ${pnlClass(totalPnl)}`}>{signedFmt(totalPnl, 2)}</span>
              </div>
              <div className="op-kpi">
                <span className="op-kpi-l">Win rate</span>
                <span className="op-kpi-v">{winRate(st.journal)}%</span>
              </div>
              <div className="op-kpi">
                <span className="op-kpi-l">Wins</span>
                <span className="op-kpi-v success">{st.journal.filter((r) => r.outcome === 'win').length}</span>
              </div>
              <div className="op-kpi">
                <span className="op-kpi-l">Losses</span>
                <span className="op-kpi-v danger">{st.journal.filter((r) => r.outcome === 'loss').length}</span>
              </div>
              <div className="op-kpi">
                <span className="op-kpi-l">Avg R:R</span>
                <span className="op-kpi-v">{st.journal.length ? `1 : ${avgRr.toFixed(2)}` : '—'}</span>
              </div>
            </div>
          </div>
          <div className="op-section">
            <div className="op-section-label">Quick start</div>
            {isDailyLossBlocked(st) ? (
              <span
                className="btn btn-primary btn-full btn-lg btn-disabled"
                aria-disabled="true"
                title="Daily loss limit reached."
              >
                + New Trade
              </span>
            ) : (
              <Link className="btn btn-primary btn-full btn-lg" to="/trade">
                + New Trade
              </Link>
            )}
          </div>
          <div className="op-footer-hint" style={{ marginTop: 'auto' }}>
            Click any note field below to edit. Changes are saved automatically.
          </div>
        </aside>
      </div>
    </section>
  );
}
