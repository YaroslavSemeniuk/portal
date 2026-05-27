import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { computeUnrealized, fmt, pnlClass, signedFmt } from '../../lib/format';
import { closePositionAtMarket } from '../../lib/positionActions';
import { Sim } from '../../lib/sim';
import { useGKState } from '../../hooks/useGKState';
import { MainTopAlerts } from '../../components/layout/MainTopAlerts';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { CloseConfirmModal } from '../../components/ui/CloseConfirmModal';
import { PairIcon } from '../../components/ui/PairIcon';
import { useToast } from '../../app/toast';
export function PostView(): React.ReactElement {
  const st = useGKState();
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const pos = st.positions[0] ?? st.lastTrade;
  const [, tick] = useState(0);

  useEffect(() => {
    if (!pos || pos.closedAt) return;
    let raf = 0;
    return Sim.on('tick', (t: unknown) => {
      const p = t as { symbol: string };
      if (p.symbol !== pos.symbol) return;
      if (document.visibilityState === 'hidden') return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        tick((x) => x + 1);
      });
    });
  }, [pos]);

  if (!pos) {
    return (
      <section className="view">
        <div className="frame">
          <Sidebar active="" />
          <Topbar />
          <main className="main">
            <MainTopAlerts />
            <div className="empty" style={{ padding: '80px 20px' }}>
              <div className="empty-illu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M8 12h8" />
                </svg>
              </div>
              <div className="empty-title">No active or recent position</div>
              <div className="empty-sub">Open a new trade to see it here.</div>
              <div style={{ marginTop: 16 }}>
                <Link className="btn btn-primary" to="/trade">
                  + New trade
                </Link>
              </div>
            </div>
          </main>
          <aside className="orderpanel">
            <div className="op-head">
              <div className="op-title">Order entry</div>
              <div className="op-step">Ready</div>
            </div>
            <div className="op-section">
              <Link className="btn btn-primary btn-full btn-lg" to="/trade">
                + New Trade
              </Link>
            </div>
          </aside>
        </div>
      </section>
    );
  }

  const meta = Sim.getMeta(pos.symbol);
  const q = Sim.getQuote(pos.symbol);
  if (!meta || !q) return <section className="view">…</section>;

  const hasSlip = pos.slippagePips > 0;
  const actualRisk = pos.riskUsd * (1 + pos.slippagePips * 0.01);
  const actualRR = pos.rr * (hasSlip ? 1 - pos.slippagePips * 0.02 : 1);
  const isClosed = !!pos.closedAt;
  const pnlNow = isClosed && pos.realizedPnL != null ? pos.realizedPnL : computeUnrealized(pos, q);

  const headIcon = isClosed ? 'success' : hasSlip ? 'warn' : 'success';
  const headTitle = isClosed
    ? pnlNow >= 0
      ? 'Position closed · profit booked'
      : 'Position closed'
    : hasSlip
      ? 'Filled with minor slippage'
      : 'Filled at requested price';

  const confirmClose = () => {
    if (!pos || pos.closedAt) return;
    const pnl = closePositionAtMarket(pos);
    toast(`Position closed · ${signedFmt(pnl, 2)}`, pnl >= 0 ? 'success' : 'error');
    setModal(false);
  };

  const dist =
    pos.direction === 'long'
      ? {
          sl: ((q.last - pos.sl) / meta.pip).toFixed(0),
          tp: ((pos.tp - q.last) / meta.pip).toFixed(0),
        }
      : {
          sl: ((pos.sl - q.last) / meta.pip).toFixed(0),
          tp: ((q.last - pos.tp) / meta.pip).toFixed(0),
        };

  return (
    <section className="view">
      <div className="frame">
        <Sidebar active="" />
        <Topbar />
        <main className="main">
          <MainTopAlerts />
          <div className="page-head">
            <div>
              <div className="stepper" style={{ marginBottom: 12 }}>
                <div className="step done">
                  <span className="step-num">✓</span> Instrument
                </div>
                <div className="step-divider" />
                <div className="step done">
                  <span className="step-num">✓</span> Risk &amp; SL
                </div>
                <div className="step-divider" />
                <div className="step done">
                  <span className="step-num">✓</span> Review
                </div>
                <div className="step-divider" />
                <div className="step active">
                  <span className="step-num">4</span> Truth
                </div>
              </div>
              <div className="page-title">{isClosed ? 'Position closed' : 'Position open'}</div>
              <div className="page-sub">
                {pos.symbol} · {pos.direction.toUpperCase()} · {pos.id}
              </div>
            </div>
            <div className="cta-row">
              <Link className="btn btn-ghost" to="/dashboard">
                ← Dashboard
              </Link>
              {!isClosed ? (
                <button type="button" className="btn btn-danger" onClick={() => setModal(true)}>
                  Close at market
                </button>
              ) : (
                <Link className="btn btn-primary" to="/trade">
                  + New trade
                </Link>
              )}
            </div>
          </div>

          <div className={`post-card ${pnlNow >= 0 ? 'win' : 'loss'}`}>
            <div className="post-head">
              <div className={`post-head-icon ${headIcon}`}>{isClosed ? '✓' : hasSlip ? '!' : '✓'}</div>
              <div>
                <div className="post-head-title">{headTitle}</div>
                <div className="post-head-sub">
                  {isClosed
                    ? `Closed at ${new Date(pos.closedAt!).toLocaleTimeString()}`
                    : `Opened at ${new Date(pos.openedAt).toLocaleTimeString()}`}{' '}
                  · simulated fill
                </div>
              </div>
            </div>

            <div className="post-table">
              <div className="post-table-row head">
                <div className="l">Field</div>
                <div className="v">Requested</div>
                <div className="v">Estimated</div>
                <div className="v">Actual</div>
              </div>
              <div className="post-table-row">
                <div className="l">Entry price</div>
                <div className="v">{pos.requestedEntry.toFixed(meta.decimals)}</div>
                <div className="v">{pos.requestedEntry.toFixed(meta.decimals)}</div>
                <div className="v">{pos.entry.toFixed(meta.decimals)}</div>
              </div>
              <div className={`post-table-row ${hasSlip ? 'slip-alert' : 'slip-ok'}`}>
                <div className="l">Slippage</div>
                <div className="v">0.0 pips</div>
                <div className="v">±0.5 pips</div>
                <div className="v">{hasSlip ? `+${pos.slippagePips.toFixed(2)} pips` : '0.0 pips'}</div>
              </div>
              <div className="post-table-row">
                <div className="l">Stop loss</div>
                <div className="v">{pos.sl.toFixed(meta.decimals)}</div>
                <div className="v">{pos.sl.toFixed(meta.decimals)}</div>
                <div className="v">{pos.sl.toFixed(meta.decimals)}</div>
              </div>
              <div className="post-table-row">
                <div className="l">Take profit</div>
                <div className="v">{pos.tp.toFixed(meta.decimals)}</div>
                <div className="v">{pos.tp.toFixed(meta.decimals)}</div>
                <div className="v">{pos.tp.toFixed(meta.decimals)}</div>
              </div>
              <div className="post-table-row">
                <div className="l">$ Risk</div>
                <div className="v">${fmt(pos.riskUsd, 2)}</div>
                <div className="v">${fmt(pos.riskUsd, 2)}</div>
                <div className="v">${fmt(actualRisk, 2)}</div>
              </div>
              <div className="post-table-row">
                <div className="l">R : R</div>
                <div className="v">1 : {pos.rr.toFixed(2)}</div>
                <div className="v">1 : {pos.rr.toFixed(2)}</div>
                <div className="v">1 : {actualRR.toFixed(2)}</div>
              </div>
            </div>

            {hasSlip ? (
              <div className="gk-bar warn">
                <div className="gk-icon">!</div>
                <div className="gk-content">
                  <div className="gk-title">Filled with +{pos.slippagePips.toFixed(2)} pips slippage</div>
                  <div className="gk-text">
                    Entry executed at <strong>{pos.entry.toFixed(meta.decimals)}</strong>. Stop-loss unchanged at{' '}
                    <strong>{pos.sl.toFixed(meta.decimals)}</strong>. Dollar risk:{' '}
                    <strong>
                      ${fmt(pos.riskUsd, 2)} → ${fmt(actualRisk, 2)}
                    </strong>
                    . R:R:{' '}
                    <strong>
                      1 : {pos.rr.toFixed(2)} → 1 : {actualRR.toFixed(2)}
                    </strong>
                    . This is normal in live markets.
                  </div>
                </div>
              </div>
            ) : (
              <div className="gk-bar clear">
                <div className="gk-icon">✓</div>
                <div className="gk-content">
                  <div className="gk-title">No slippage</div>
                  <div className="gk-text">Fill matched your requested price exactly. Risk and R:R remain as planned.</div>
                </div>
              </div>
            )}

            {isClosed ? (
              <div className="gk-bar clear">
                <div className="gk-icon">✓</div>
                <div className="gk-content">
                  <div className="gk-title">This day counts toward your trading days</div>
                  <div className="gk-text">
                    Trading days: <strong>{st.daysCounted}</strong> / <strong>{st.rules.minDays}</strong>. Net result:{' '}
                    <strong className={pnlNow >= 0 ? 'text-success' : 'text-danger'}>{signedFmt(pnlNow, 2)}</strong>.
                  </div>
                </div>
              </div>
            ) : null}

            {!isClosed ? (
              <div style={{ marginTop: 8 }}>
                <div className="op-section-label" style={{ marginBottom: 8 }}>
                  Live position
                </div>
                <div className="post-position-card">
                  <PairIcon iconClass={meta.iconClass} label={meta.short} size={42} />
                  <div className="pos-cell">
                    <span className="pc-l">Side</span>
                    <span className={`pc-v dir ${pos.direction}`}>{pos.direction.toUpperCase()}</span>
                  </div>
                  <div className="pos-cell">
                    <span className="pc-l">Entry</span>
                    <span className="pc-v">{pos.entry.toFixed(meta.decimals)}</span>
                  </div>
                  <div className="pos-cell">
                    <span className="pc-l">Mark</span>
                    <span className="pc-v">{q.last.toFixed(meta.decimals)}</span>
                  </div>
                  <div className="pos-cell">
                    <span className="pc-l">Distance SL/TP</span>
                    <span className="pc-v">
                      {dist.sl} / {dist.tp} pips
                    </span>
                  </div>
                  <div className="pos-cell">
                    <span className="pc-l">Unrealized</span>
                    <span className={`pc-v ${pnlClass(pnlNow)}`}>{signedFmt(pnlNow, 2)}</span>
                  </div>
                  <button type="button" className="pos-action" onClick={() => setModal(true)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="cta-row center">
                <Link className="btn btn-ghost" to="/journal">
                  View in Journal
                </Link>
                <Link className="btn btn-primary btn-lg" to="/dashboard">
                  Back to Dashboard
                </Link>
              </div>
            )}
          </div>
        </main>

        <aside className="orderpanel">
          <div className="op-head">
            <div className="op-title">{isClosed ? 'Order entry' : 'Manage position'}</div>
            <div className="op-step">{isClosed ? 'Ready' : 'Active'}</div>
          </div>
          {!isClosed ? (
            <>
              <div className="op-section">
                <div className="op-section-label">Position summary</div>
                <div className="op-kpi-list">
                  <div className="op-kpi">
                    <span className="op-kpi-l">Symbol</span>
                    <span className="op-kpi-v">{pos.symbol}</span>
                  </div>
                  <div className="op-kpi">
                    <span className="op-kpi-l">Direction</span>
                    <span className="op-kpi-v">{pos.direction.toUpperCase()}</span>
                  </div>
                  <div className="op-kpi">
                    <span className="op-kpi-l">Entry</span>
                    <span className="op-kpi-v">{pos.entry.toFixed(meta.decimals)}</span>
                  </div>
                  <div className="op-kpi">
                    <span className="op-kpi-l">Size</span>
                    <span className="op-kpi-v">{fmt(pos.units, 0)} units</span>
                  </div>
                  <div className="op-kpi">
                    <span className="op-kpi-l">Mark</span>
                    <span className="op-kpi-v">{q.last.toFixed(meta.decimals)}</span>
                  </div>
                  <div className="op-kpi">
                    <span className="op-kpi-l">Unrealized</span>
                    <span className={`op-kpi-v ${pnlClass(pnlNow)}`}>{signedFmt(pnlNow, 2)}</span>
                  </div>
                </div>
              </div>
              <div className="op-section">
                <div className="op-section-label">Actions</div>
                <button type="button" className="btn btn-danger btn-full" onClick={() => setModal(true)}>
                  Close at market
                </button>
                <button type="button" className="btn btn-ghost btn-full" disabled title="Coming in full version">
                  Modify SL/TP
                  <span className="coming-soon-pill">Coming Soon</span>
                </button>
              </div>
            </>
          ) : (
            <div className="op-section">
              <div className="op-section-label">Quick start</div>
              <Link className="btn btn-primary btn-full btn-lg" to="/trade">
                + New Trade
              </Link>
            </div>
          )}
          <div className="op-footer-hint" style={{ marginTop: 'auto' }}>
            {isClosed ? 'Position closed. Ready for the next trade.' : 'Live P&L updates every 1.5s with the simulated price feed.'}
          </div>
        </aside>
      </div>
      {modal && !isClosed ? <CloseConfirmModal pos={pos} onCancel={() => setModal(false)} onConfirm={confirmClose} /> : null}
    </section>
  );
}
