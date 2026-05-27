import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeOrder } from '../../lib/orderCalc';
import { Sim } from '../../lib/sim';
import { getState, setState } from '../../lib/store';
import type { JournalEntry, Position } from '../../lib/types';
import { useGKState } from '../../hooks/useGKState';
import { useTradeDraft } from '../../app/tradeDraft';
import { useToast } from '../../app/toast';
import { MainTopAlerts } from '../../components/layout/MainTopAlerts';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { TradeChart } from '../../components/trade/TradeChart';
import { TF_OPTIONS, type ChartSeriesType } from '../../lib/chartConstants';
import { OrderPanel } from './OrderPanel';

function useLiveQuote(sym: string): void {
  const [, setN] = useState(0);
  useEffect(() => {
    return Sim.on('tick', (t: unknown) => {
      const p = t as { symbol: string };
      if (p.symbol !== sym) return;
      setN((x) => x + 1);
    });
  }, [sym]);
}

export function TradeView(): React.ReactElement {
  const st = useGKState();
  const { draft, setDraft } = useTradeDraft();
  const navigate = useNavigate();
  const toast = useToast();
  const [tf, setTf] = useState(1);
  const [seriesType, setSeriesType] = useState<ChartSeriesType>('candles');

  useLiveQuote(draft.symbol ?? '');
  const meta = draft.symbol ? Sim.getMeta(draft.symbol) : null;
  const q = draft.symbol ? Sim.getQuote(draft.symbol) : null;

  const execute = async () => {
    if (!draft.symbol || !draft.direction || draft.entry == null || draft.sl == null || draft.tp == null) return;
    const st0 = getState();
    const calc = computeOrder(draft as Parameters<typeof computeOrder>[0], st0.balance);
    await new Promise((r) => setTimeout(r, 200));
    const fill = Sim.simulateFill(draft.symbol, draft.entry, draft.direction);
    const journalEntryId = `TR-${Date.now().toString(36)}`;
    const pendingJournal: JournalEntry = {
      id: journalEntryId,
      symbol: draft.symbol,
      direction: draft.direction,
      entry: fill.fill,
      exit: fill.fill,
      sl: draft.sl,
      tp: draft.tp,
      pnl: 0,
      pnlPct: 0,
      rr: calc.rr,
      riskUsd: calc.riskUsd,
      slippage: fill.slippagePips,
      durationMin: 0,
      ts: Date.now(),
      outcome: 'pending',
      notes: 'Open position — final P&L recorded when the trade is closed.',
    };
    const pos: Position = {
      id: `POS-${Date.now().toString().slice(-6)}`,
      symbol: draft.symbol,
      direction: draft.direction,
      requestedEntry: draft.entry,
      entry: fill.fill,
      sl: draft.sl,
      tp: draft.tp,
      slippagePips: fill.slippagePips,
      units: calc.units,
      riskUsd: calc.riskUsd,
      rr: calc.rr,
      openedAt: Date.now(),
      journalEntryId,
    };
    const stNow = getState();
    setState({ positions: [...stNow.positions, pos], lastTrade: pos, journal: [pendingJournal, ...stNow.journal] });
    toast(`Order filled · ${draft.symbol} ${draft.direction.toUpperCase()}`, 'success');
    setDraft({ step: 1, symbol: null, direction: null, entry: null, sl: null, tp: null, search: '' });
    navigate('/post');
  };

  return (
    <section className="view">
      <div className="frame">
        <Sidebar active="trade" />
        <Topbar />
        <main className="main">
          <MainTopAlerts />
          <div className="page-head">
            <div>
              <div className="page-title">New trade</div>
              <div className="page-sub">Build the order, watch the gatekeeper react in real time.</div>
            </div>
            <div className="stepper">
              <div className={`step ${draft.step === 1 ? 'active' : draft.step > 1 ? 'done' : ''}`}>
                <span className="step-num">{draft.step > 1 ? '✓' : 1}</span> Instrument
              </div>
              <div className="step-divider" />
              <div className={`step ${draft.step === 2 ? 'active' : draft.step > 2 ? 'done' : ''}`}>
                <span className="step-num">{draft.step > 2 ? '✓' : 2}</span> Risk &amp; SL
              </div>
              <div className="step-divider" />
              <div className={`step ${draft.step === 3 ? 'active' : ''}`}>
                <span className="step-num">{draft.step > 3 ? '✓' : 3}</span> Review
              </div>
              <div className="step-divider" />
              <div className="step">
                <span className="step-num">4</span> Truth
              </div>
            </div>
          </div>

          {draft.symbol && meta && q ? (
            <>
              <div className="chart-header">
                <div>
                  <div className="chart-pair" id="chart-pair">
                    {draft.symbol}
                    {draft.direction ? (
                      <small>
                        {' '}
                        · {draft.direction === 'long' ? 'Long ↗' : 'Short ↘'}
                      </small>
                    ) : null}
                  </div>
                  <div className="chart-price">
                    <span className="chart-price-val mono" id="chart-price">
                      {q.last.toFixed(meta.decimals)}
                    </span>
                    <span className={`chart-price-chg ${q.changePct >= 0 ? 'up' : 'down'}`} id="chart-chg">
                      {(q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="chart-toolbar">
                  <div className="chart-type-toggle" role="tablist" aria-label="Chart type">
                    {(['candles', 'line', 'area'] as const).map((ct) => (
                      <button
                        key={ct}
                        type="button"
                        className={`ct-btn ${seriesType === ct ? 'is-on' : ''}`}
                        title={ct}
                        onClick={() => setSeriesType(ct)}
                      >
                        {ct === 'candles' ? (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <line x1="7" y1="3" x2="7" y2="21" />
                            <rect x="4" y="7" width="6" height="10" rx="1" fill="currentColor" stroke="none" />
                            <line x1="17" y1="3" x2="17" y2="21" />
                            <rect x="14" y="10" width="6" height="8" rx="1" />
                          </svg>
                        ) : ct === 'line' ? (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 17 9 11 13 14 21 6" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 19V13L9 7L13 11L21 4V19Z" fill="currentColor" fillOpacity="0.25" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="chart-tf" role="tablist" aria-label="Timeframe">
                    {TF_OPTIONS.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={`tf-btn ${tf === o.min ? 'is-on' : ''}`}
                        onClick={() => setTf(o.min)}
                      >
                        {o.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <section className="chart-area">
                <TradeChart
                  symbol={draft.symbol}
                  tfMinutes={tf}
                  seriesType={seriesType}
                  entry={draft.step >= 2 ? draft.entry : null}
                  sl={draft.step >= 2 ? draft.sl : null}
                  tp={draft.step >= 2 ? draft.tp : null}
                />
                <div className="chart-tooltip" id="chart-tooltip" hidden>
                  <div className="ct-time" id="ctt-time">—</div>
                  <div className="ct-row"><span className="ct-l">O</span><span className="ct-v" id="ctt-o">—</span></div>
                  <div className="ct-row"><span className="ct-l">H</span><span className="ct-v" id="ctt-h">—</span></div>
                  <div className="ct-row"><span className="ct-l">L</span><span className="ct-v" id="ctt-l">—</span></div>
                  <div className="ct-row"><span className="ct-l">C</span><span className="ct-v" id="ctt-c">—</span></div>
                  <div className="ct-row ct-chg"><span className="ct-l">Δ</span><span className="ct-v" id="ctt-chg">—</span></div>
                </div>
              </section>
            </>
          ) : (
            <div className="chart-no-symbol">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M3 3v18h18M7 14l4-4 4 4 5-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Select an instrument from the panel to begin.</span>
            </div>
          )}
        </main>

        <aside className="orderpanel" id="orderpanel">
          <OrderPanel draft={draft} setDraft={setDraft} st={st} onExecute={execute} />
        </aside>
      </div>
    </section>
  );
}
