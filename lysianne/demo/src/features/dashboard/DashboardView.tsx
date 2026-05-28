import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { INSTRUMENTS } from '../../lib/data';
import { computeUnrealized, fmt, formatDateTime, formatShortDate, getGreeting, pnlClass, signedFmt } from '../../lib/format';
import { formatNewsCountdown } from '../../lib/news';
import { isTradingBlocked } from '../../lib/store';
import { getNewTradeBlockTitle, isNewTradeBlocked } from '../../lib/tradeAccess';
import { formatRulesActiveSubtitle, getRulesActiveSummary } from '../../lib/rulesStatus';
import { closePositionAtMarket } from '../../lib/positionActions';
import { Sim } from '../../lib/sim';
import { useGKState } from '../../hooks/useGKState';
import { MainTopAlerts } from '../../components/layout/MainTopAlerts';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { Sparkline } from '../../components/ui/Sparkline';
import { useToast } from '../../app/toast';
import type { Position } from '../../lib/types';
import { CloseConfirmModal } from '../../components/ui/CloseConfirmModal';
import { PairIcon } from '../../components/ui/PairIcon';
import { useTradeDraft } from '../../app/tradeDraft';

const LIVE_SYMS = INSTRUMENTS.map((i) => i.symbol) as unknown as readonly string[];
const QUICK_SYMS = INSTRUMENTS.map((i) => i.symbol) as unknown as readonly string[];

function useLiveQuotes(symbols: readonly string[]): void {
  const [, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    return Sim.on('tick', (t: unknown) => {
      const p = t as { symbol: string };
      if (!symbols.includes(p.symbol)) return;
      if (document.visibilityState === 'hidden') return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setN((x) => x + 1);
      });
    });
  }, [symbols]);
}

function PairCard({ sym, layout = 'row' }: { sym: string; layout?: 'row' | 'col' }): React.ReactElement {
  useLiveQuotes([sym]);
  const meta = Sim.getMeta(sym);
  const q = Sim.getQuote(sym);
  if (!meta || !q) return <></>;
  const spark = Sim.getRecentCloses(sym, 30);
  const col = layout === 'col';
  return (
    <div
      className="pair-card"
      data-symbol={sym}
      data-pair-card
      style={
        col ? { padding: '14px 16px', flexDirection: 'column', alignItems: 'stretch', gap: 10 } : undefined
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PairIcon iconClass={meta.iconClass} label={meta.short} />
        <div className="pair-info">
          <div className="pair-name">{sym}</div>
          <div className="pair-spread">spread {meta.spread.toFixed(1)} pips</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="pair-price-val mono" data-pair-price={sym}>
          {q.last.toFixed(meta.decimals)}
        </div>
        <div className={`pair-price-chg ${q.changePct >= 0 ? 'up' : 'down'}`} data-pair-chg={sym}>
          {(q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2)}%
        </div>
      </div>
      <Sparkline points={spark} className={`spark ${q.changePct >= 0 ? 'up' : 'down'}`} height={col ? 32 : 28} />
    </div>
  );
}

function QuickPairRow({ sym }: { sym: string }): React.ReactElement {
  useLiveQuotes([sym]);
  const meta = Sim.getMeta(sym);
  const q = Sim.getQuote(sym);
  if (!meta || !q) return <></>;
  return (
    <div className="pair-card" data-symbol={sym} data-pair-card>
        <PairIcon iconClass={meta.iconClass} label={meta.short} />
      <div className="pair-info">
        <div className="pair-name">{sym}</div>
        <div className="pair-spread">Spread {meta.spread.toFixed(1)} pips</div>
      </div>
      <div className="pair-price">
        <div className="pair-price-val mono" data-pair-price={sym}>
          {q.last.toFixed(meta.decimals)}
        </div>
        <div className={`pair-price-chg ${q.changePct >= 0 ? 'up' : 'down'}`} data-pair-chg={sym}>
          {(q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function OpenRow({
  p,
  onClose,
  closeDisabled,
}: {
  p: Position;
  onClose: () => void;
  closeDisabled?: boolean;
}): React.ReactElement {
  useLiveQuotes([p.symbol]);
  const meta = Sim.getMeta(p.symbol);
  const q = Sim.getQuote(p.symbol);
  if (!meta || !q) return <></>;
  const pnl = computeUnrealized(p, q);
  return (
    <div className="pos-row">
      <div className="pos-sym">
        <PairIcon iconClass={meta.iconClass} label={meta.short} />
        <div className="pos-sym-info">
          <div className="pos-sym-name">{p.symbol}</div>
          <div className="pos-sym-sub">
            {fmt(p.units, 0)} units · {p.id}
          </div>
        </div>
      </div>
      <div className="pos-cell">
        <span className="pc-l">Side</span>
        <span className={`pc-v dir ${p.direction}`}>{p.direction.toUpperCase()}</span>
      </div>
      <div className="pos-cell">
        <span className="pc-l">Entry</span>
        <span className="pc-v">{p.entry.toFixed(meta.decimals)}</span>
      </div>
      <div className="pos-cell">
        <span className="pc-l">Mark</span>
        <span className="pc-v">{q.last.toFixed(meta.decimals)}</span>
      </div>
      <div className="pos-cell">
        <span className="pc-l">Stop / Target</span>
        <span className="pc-v">
          {p.sl.toFixed(meta.decimals)} / {p.tp.toFixed(meta.decimals)}
        </span>
      </div>
      <div className="pos-cell">
        <span className="pc-l">Unrealized</span>
        <span className={`pc-v mono ${pnlClass(pnl)}`}>{signedFmt(pnl, 2)}</span>
      </div>
      <button
        type="button"
        className={`pos-action${closeDisabled ? ' pos-action-disabled' : ''}`}
        onClick={onClose}
        disabled={closeDisabled}
        title={closeDisabled ? 'Re-confirm your rules to manage positions' : undefined}
      >
        Close
      </button>
    </div>
  );
}

export function DashboardView(): React.ReactElement {
  const st = useGKState();
  const toast = useToast();
  const { setDraft } = useTradeDraft();
  const [closePos, setClosePos] = useState<Position | null>(null);
  const [newsTick, setNewsTick] = useState(0);
  useLiveQuotes([...LIVE_SYMS, ...QUICK_SYMS]);

  useEffect(() => {
    const id = window.setInterval(() => setNewsTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const rulesBlocked = isTradingBlocked(st);
  const tradeLocked = isNewTradeBlocked(st);
  const tradeLockTitle = getNewTradeBlockTitle(st);
  const rulesSummary = useMemo(() => getRulesActiveSummary(st), [st]);
  const rulesActiveLine = formatRulesActiveSubtitle(rulesSummary);
  const newsCountdown = formatNewsCountdown(st);
  void newsTick;
  const rulesAccepted =
    st.rulesConfirmed && st.confirmedRulesEpoch === st.rulesEpoch && st.confirmedAt != null;

  const pnlPct = st.balance > 0 ? (st.dailyPnL / st.balance) * 100 : 0;
  const profitTarget = st.startingBalance * 0.08;
  const profit = Math.max(0, st.balance - st.startingBalance);
  const profitProgress = Math.min(100, (profit / profitTarget) * 100);
  const dayProgress = Math.min(100, (st.daysCounted / st.rules.minDays) * 100);

  const miniDays = useMemo(() => {
    const v = 100;
    const out: number[] = [];
    let x = v;
    for (let i = 0; i < 30; i++) {
      x += (Math.random() - 0.5 + 0.15) * 4;
      out.push(x);
    }
    return out;
  }, []);
  const miniProfit = useMemo(() => {
    const v = 100;
    const out: number[] = [];
    let x = v;
    for (let i = 0; i < 30; i++) {
      x += (Math.random() - 0.5 + 0.2) * 4;
      out.push(x);
    }
    return out;
  }, []);

  const confirmClose = () => {
    if (!closePos) return;
    const pnl = closePositionAtMarket(closePos);
    toast(`Position closed · ${signedFmt(pnl, 2)}`, pnl >= 0 ? 'success' : 'error');
    setClosePos(null);
  };

  return (
    <section className="view">
      <div className="frame">
        <Sidebar active="dashboard" />
        <Topbar />
        <main className="main">
          <MainTopAlerts />
          <div className="page-head page-head--dash">
            <div className="page-head-top">
              <div className="page-title" id="dash-greeting">
                {getGreeting('Alex')}
              </div>
              <div className="page-sub">
                {st.positions.length
                  ? `${st.positions.length} open position${st.positions.length > 1 ? 's' : ''}`
                  : rulesActiveLine}
              </div>
            </div>
            {!st.positions.length ? (
              <div className="dash-rules-compact">
                <p className="dash-rules-summary">
                  All preset rules are loaded and enforced on every order. View full details on the{' '}
                  <Link to="/rules">Rules</Link> tab.
                  {st.confirmedAt ? ` Last verified: ${formatShortDate(st.confirmedAt)}.` : ''}
                </p>
                {newsCountdown ? (
                  <p className="dash-rules-news">
                    <span className="dash-rules-news-label">Next news</span>
                    <span className="dash-rules-news-value">{newsCountdown}</span>
                  </p>
                ) : null}
                <dl className="dash-rules-times">
                  <div className="dash-rules-time">
                    <dt>Rules added</dt>
                    <dd>{st.rulesLoadedAt != null ? formatDateTime(st.rulesLoadedAt) : '—'}</dd>
                  </div>
                  <div className="dash-rules-time">
                    <dt>Rules accepted</dt>
                    <dd>
                      {rulesAccepted
                        ? formatDateTime(st.confirmedAt!)
                        : st.confirmedAt != null
                          ? `Pending · last ${formatDateTime(st.confirmedAt)}`
                          : 'Not yet accepted'}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>

          <section className="hero">
            <div className="hero-block">
              <div className="hero-label">Account balance</div>
              <div className="hero-balance mono" id="hero-balance">
                ${fmt(st.balance, 2)}
              </div>
              <div className="hero-sub">
                Evaluation window · Phase 1 · {pnlPct >= 0 ? '+' : ''}
                {pnlPct.toFixed(2)}% today
              </div>
            </div>
            <div className="hero-block mini-stat">
              <div className="hero-label">Trading days</div>
              <div className="mini-stat-val">
                {st.daysCounted}
                <span className="unit"> / {st.rules.minDays}</span>
              </div>
              <div className="mini-bar">
                <div className="mini-bar-fill" style={{ width: `${dayProgress}%` }} />
              </div>
              <Sparkline points={miniDays} className="spark mini-spark neutral" height={36} />
            </div>
            <div className="hero-block mini-stat">
              <div className="hero-label">Profit target</div>
              <div className={`mini-stat-val ${profit > 0 ? 'success' : ''}`}>
                ${fmt(profit, 0)}
                <span className="unit">
                  {' '}
                  / ${fmt(profitTarget, 0)}
                </span>
              </div>
              <div className="mini-bar">
                <div className="mini-bar-fill" style={{ width: `${profitProgress}%` }} />
              </div>
              <Sparkline points={miniProfit} className="spark mini-spark up" height={36} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Live markets</div>
                <div className="panel-sub">Updates every 1.5s · synthetic feed</div>
              </div>
              <div className="panel-meta status-line live">Tick simulator active</div>
            </div>
            <div className="rules" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              {LIVE_SYMS.map((s) =>
                tradeLocked ? (
                  <div key={s} style={{ opacity: 0.55, cursor: 'not-allowed' }} title={tradeLockTitle}>
                    <PairCard sym={s} layout="col" />
                  </div>
                ) : (
                  <Link
                    key={s}
                    to="/trade"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                    onClick={() => setDraft({ symbol: s, step: 1, direction: null, entry: null, sl: null, tp: null })}
                  >
                    <PairCard sym={s} layout="col" />
                  </Link>
                ),
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">Open positions</div>
              {st.positions.length ? (
                <Link className="btn btn-ghost btn-sm" to="/post">
                  Manage
                </Link>
              ) : null}
            </div>
            {st.positions.length ? (
              st.positions.map((p) => (
                <OpenRow key={p.id} p={p} onClose={() => setClosePos(p)} closeDisabled={rulesBlocked} />
              ))
            ) : (
              <div className="empty">
                <div className="empty-illu">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M8 12h8" />
                  </svg>
                </div>
                <div className="empty-title">No open positions</div>
                <div className="empty-sub">Start a new trade to see it here. Your rules will run in real time.</div>
              </div>
            )}
          </section>
        </main>

        <aside className="orderpanel">
          <div className="op-head">
            <div className="op-title">Order entry</div>
            <div className="op-step">Ready</div>
          </div>
          <div className="op-section">
            <div className="op-section-label">Quick start</div>
            {tradeLocked ? (
              <span
                className="btn btn-primary btn-full btn-lg btn-disabled"
                aria-disabled="true"
                title={tradeLockTitle}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                New Trade
              </span>
            ) : (
              <Link className="btn btn-primary btn-full btn-lg" to="/trade">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                New Trade
              </Link>
            )}
          </div>
          <div className="op-section">
            <div className="op-section-label">Quick pairs</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK_SYMS.map((s) =>
                tradeLocked ? (
                  <div key={s} style={{ opacity: 0.55, cursor: 'not-allowed' }} title={tradeLockTitle}>
                    <QuickPairRow sym={s} />
                  </div>
                ) : (
                  <Link
                    key={s}
                    to="/trade"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                    onClick={() => setDraft({ symbol: s, step: 1, direction: null, entry: null, sl: null, tp: null })}
                  >
                    <QuickPairRow sym={s} />
                  </Link>
                ),
              )}
            </div>
          </div>
          <div className="op-footer-hint" style={{ marginTop: 'auto' }}>
            Click <strong>+ New Trade</strong> to begin. Your rules will load as you enter parameters.
          </div>
        </aside>
      </div>
      {closePos ? (
        <CloseConfirmModal pos={closePos} onCancel={() => setClosePos(null)} onConfirm={confirmClose} />
      ) : null}
    </section>
  );
}
