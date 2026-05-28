import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { INSTRUMENTS } from '../../lib/data';
import { evaluate } from '../../lib/gatekeeper';
import { probeGatekeeper } from '../../lib/rulesStatus';
import { computeOrder } from '../../lib/orderCalc';
import { entryPriceSuffix, fmt } from '../../lib/format';
import { Sim } from '../../lib/sim';
import type { GkResult, GKState } from '../../lib/types';
import type { TradeDraft } from '../../lib/tradeDraft';
import { DailyLossGkBar } from '../../components/daily-loss/DailyLossGkBar';
import { PairIcon } from '../../components/ui/PairIcon';
import { shouldShowAccountDailyLossBar } from '../../lib/dailyLossAlert';
import { isDailyLossBlocked } from '../../lib/riskMetrics';
import { isTradingBlocked } from '../../lib/store';

function escapeHtml(s: string): string {
  return String(s || '').replace(/[&<>"']/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as const)[c as '&' | '<' | '>' | '"' | "'"]) || c);
}

function GkHintIcon(): React.ReactElement {
  return (
    <svg className="gk-hint-svg" viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.35} />
      <path
        d="M12 16.5v-5M12 7.75h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GkBar({ g }: { g: GkResult }): React.ReactElement {
  const icons: Record<string, string> = { clear: '✓', warn: '!', block: '✕', softblock: '⚠', neutral: '' };
  return (
    <div className={`gk-bar ${g.severity}`}>
      <div className={`gk-icon ${g.severity === 'neutral' ? 'gk-icon-svg' : ''}`}>
        {g.severity === 'neutral' ? <GkHintIcon /> : icons[g.severity] || '·'}
      </div>
      <div className="gk-content">
        <div className="gk-title">{g.title}</div>
        <div className="gk-text">{g.text}</div>
      </div>
    </div>
  );
}

function GkWarningsList({
  checks,
  hideDailyLoss,
}: {
  checks: GkResult['checks'];
  hideDailyLoss?: boolean;
}): React.ReactElement | null {
  const warns = checks.filter(
    (c) => c.severity === 'warn' && c.message && (!hideDailyLoss || c.id !== 'dailyLoss'),
  );
  if (!warns.length) return null;
  return (
    <ul className="gk-warnings" aria-label="Rule warnings">
      {warns.map((c) => (
        <li key={c.id} className="gk-warn-item">
          {c.message}
        </li>
      ))}
    </ul>
  );
}

function OpGkPanel({
  gk,
  accountDailyLossBar,
  dailyBlocked,
}: {
  gk: GkResult;
  accountDailyLossBar: boolean;
  dailyBlocked: boolean;
}): React.ReactElement {
  const blockers = gk.checks.filter((c) => c.severity === 'block');
  const onlyDailyBlocks = blockers.length > 0 && blockers.every((c) => c.id === 'dailyLoss');
  const showDailyBarFirst = dailyBlocked || onlyDailyBlocks;

  return (
    <div id="op-gk" className="op-gk-stack">
      {showDailyBarFirst && accountDailyLossBar ? <DailyLossGkBar /> : null}
      <GkStatusBlock gk={gk} hideDailyLossWarn={accountDailyLossBar} />
      {!showDailyBarFirst && accountDailyLossBar ? <DailyLossGkBar /> : null}
    </div>
  );
}

function GkStatusBlock({ gk, hideDailyLossWarn }: { gk: GkResult; hideDailyLossWarn?: boolean }): React.ReactElement {
  if (gk.severity === 'clear') {
    return (
      <>
        <div className="gk-bar clear gk-bar-ready">
          <div className="gk-icon">✓</div>
          <div className="gk-content">
            <div className="gk-title">All clear</div>
            <div className="gk-text">{gk.text}</div>
          </div>
        </div>
        <GkWarningsList checks={gk.checks} hideDailyLoss={hideDailyLossWarn} />
      </>
    );
  }
  const blockers = gk.checks.filter((c) => c.severity === 'block');
  if (
    hideDailyLossWarn &&
    gk.severity === 'block' &&
    blockers.length > 0 &&
    blockers.every((c) => c.id === 'dailyLoss')
  ) {
    return <></>;
  }
  return <GkBar g={gk} />;
}

function formatPriceLevel(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/** Digits and at most one decimal point (strips letters and other symbols). */
function sanitizePriceInput(raw: string): string {
  let s = raw.replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot >= 0) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  }
  return s;
}

function parsePriceInput(raw: string): number | null {
  const trimmed = sanitizePriceInput(raw.trim());
  if (!trimmed || trimmed === '.' || trimmed.endsWith('.')) return null;
  const v = parseFloat(trimmed);
  if (Number.isNaN(v) || v <= 0) return null;
  return v;
}

/** Local string while typing; commits to draft on input (live) and formats on blur. */
function usePriceFieldInput(value: number | null | undefined, decimals: number, enabled: boolean) {
  const [input, setInput] = useState('');
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!enabled || value == null) return;
    if (focusedRef.current) return;
    setInput(formatPriceLevel(value, decimals));
  }, [enabled, value, decimals]);

  const focus = () => {
    focusedRef.current = true;
  };

  const change = (raw: string, onCommit: (v: number) => void, isValid?: (v: number) => boolean) => {
    const sanitized = sanitizePriceInput(raw);
    setInput(sanitized);
    const v = parsePriceInput(sanitized);
    if (v == null) return;
    if (isValid && !isValid(v)) return;
    onCommit(v);
  };

  const blur = (onCommit: (v: number) => void, isValid?: (v: number) => boolean) => {
    focusedRef.current = false;
    const trimmed = sanitizePriceInput(input.trim());
    if (!trimmed) {
      if (value != null) setInput(formatPriceLevel(value, decimals));
      return;
    }
    const v = parseFloat(trimmed);
    if (Number.isNaN(v) || v <= 0 || (isValid && !isValid(v))) {
      if (value != null) setInput(formatPriceLevel(value, decimals));
      return;
    }
    onCommit(v);
    setInput(formatPriceLevel(v, decimals));
  };

  return { input, focus, change, blur };
}

function PairRow({
  sym,
  selected,
  onPick,
}: {
  sym: string;
  selected: boolean;
  onPick: () => void;
}): React.ReactElement {
  const meta = Sim.getMeta(sym);
  const quote = Sim.getQuote(sym);
  if (!meta || !quote) return <></>;
  return (
    <div
      className={`pair-card ${selected ? 'selected' : ''}`}
      data-symbol={sym}
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => e.key === 'Enter' && onPick()}
    >
      <PairIcon iconClass={meta.iconClass} label={meta.short} />
      <div className="pair-info">
        <div className="pair-name">{sym}</div>
        <div className="pair-spread">Spread {meta.spread.toFixed(1)} pips</div>
      </div>
      <div className="pair-price">
        <div className="pair-price-val mono">{quote.last.toFixed(meta.decimals)}</div>
        <div className={`pair-price-chg ${quote.changePct >= 0 ? 'up' : 'down'}`}>
          {(quote.changePct >= 0 ? '+' : '') + quote.changePct.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export function OrderPanel({
  draft,
  setDraft,
  st,
  onExecute,
}: {
  draft: TradeDraft;
  setDraft: (p: Partial<TradeDraft> | ((d: TradeDraft) => TradeDraft)) => void;
  st: GKState;
  onExecute: () => void;
}): React.ReactElement {
  const meta = draft.symbol ? Sim.getMeta(draft.symbol) : undefined;

  const [riskInput, setRiskInput] = useState<string>(String(draft.riskPct));
  const priceFieldsEnabled =
    draft.step === 2 && draft.entry != null && draft.sl != null && draft.tp != null && meta != null;
  const priceDecimals = meta?.decimals ?? 5;
  const slField = usePriceFieldInput(draft.sl, priceDecimals, priceFieldsEnabled);
  const tpField = usePriceFieldInput(draft.tp, priceDecimals, priceFieldsEnabled);
  const entryField = usePriceFieldInput(draft.entry, priceDecimals, priceFieldsEnabled);

  const q = (draft.search || '').toLowerCase().trim();
  const matches = useMemo(
    () => INSTRUMENTS.filter((i) => !q || i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)),
    [q],
  );

  const accountDailyLossBar = shouldShowAccountDailyLossBar(st);
  const dailyBlocked = isDailyLossBlocked(st);
  const rulesBlocked = isTradingBlocked(st);

  const [gkTick, setGkTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setGkTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const probeGk = useMemo(() => probeGatekeeper(st), [st, gkTick]);

  const calc = useMemo(() => computeOrder(draft, st.balance), [draft, st.balance]);
  const gk = useMemo(
    () =>
      draft.step >= 2 && draft.entry != null && draft.sl != null && draft.tp != null && draft.direction
        ? evaluate(
            {
              riskUsd: calc.riskUsd,
              effectiveRiskUsd: calc.effectiveRiskUsd,
              sl: draft.sl,
              expectedDayProfit: calc.tpProfit,
              rewardRatio: calc.rr,
            },
            st,
          )
        : null,
    [
      draft.step,
      draft.entry,
      draft.sl,
      draft.tp,
      draft.direction,
      calc.riskUsd,
      calc.effectiveRiskUsd,
      calc.tpProfit,
      st,
      gkTick,
    ],
  );

  const panelGk = gk ?? probeGk;
  const showGkPanel =
    panelGk.severity === 'block' || panelGk.severity === 'warn' || panelGk.severity === 'softblock' || accountDailyLossBar;
  const orderBlocked = panelGk.severity === 'block' || dailyBlocked || rulesBlocked;

  if (draft.step === 1) {
    const quote = draft.symbol ? Sim.getQuote(draft.symbol) : null;
    const symbolSelected = !!draft.symbol && !!meta;
    const dirDisabled = !symbolSelected || matches.length === 0;
    const continueDisabled = !draft.direction || dirDisabled || orderBlocked;
    return (
      <>
        <div className="op-head">
          <div className="op-title">{draft.symbol ? `Order entry · ${draft.symbol}` : 'Order entry'}</div>
          <div className="op-step">Step 1 of 4</div>
        </div>
        {showGkPanel ? <OpGkPanel gk={panelGk} accountDailyLossBar={accountDailyLossBar} dailyBlocked={dailyBlocked} /> : null}
        <div className="op-section">
          <div className="op-section-label">Instrument</div>
          <div className="op-search">
            <input
              className="op-search-input"
              type="text"
              placeholder="Search pair — e.g. EUR/USD, GBP/USD"
              value={draft.search}
              onChange={(e) => setDraft({ search: e.target.value })}
            />
          </div>
          <div className="op-search-hint">
            {matches.length ? `${matches.length} pair${matches.length > 1 ? 's' : ''} available` : 'Type to find pairs'}
          </div>
          {matches.length === 0 ? (
            <div className="op-search-empty">
              No instruments matching <strong>&quot;{escapeHtml(draft.search)}&quot;</strong>. Try EUR/USD or GBP/USD.
            </div>
          ) : (
            <div className="instrument-list">
              {matches.map((i) => (
                <PairRow
                  key={i.symbol}
                  sym={i.symbol}
                  selected={draft.symbol === i.symbol}
                  onPick={() => setDraft({ symbol: i.symbol, entry: null, sl: null, tp: null, direction: null })}
                />
              ))}
            </div>
          )}
        </div>
        {symbolSelected && meta && quote ? (
          <div className="op-section">
            <div className="op-section-label">Market price</div>
            <div className="op-price-row">
              <div className="op-price-side">
                <span className="op-price-l">Bid</span>
                <span className="op-price-v mono">{quote.bid.toFixed(meta.decimals)}</span>
              </div>
              <div className="op-price-side" style={{ textAlign: 'center' }}>
                <span className="op-spread">{meta.spread.toFixed(1)} pips</span>
              </div>
              <div className="op-price-side" style={{ textAlign: 'right' }}>
                <span className="op-price-l">Ask</span>
                <span className="op-price-v mono">{quote.ask.toFixed(meta.decimals)}</span>
              </div>
            </div>
          </div>
        ) : null}
        {symbolSelected ? (
          <div className="op-section">
            <div className="op-section-label">Direction</div>
            <div className="op-dir-row">
              <div
                className={`op-dir ${draft.direction === 'long' ? 'active' : ''}`}
                data-direction="long"
                role="button"
                tabIndex={0}
                onClick={() => setDraft({ direction: 'long' })}
              >
                <span className="op-dir-arrow">↗</span>
                <span>Long · Buy</span>
              </div>
              <div
                className={`op-dir ${draft.direction === 'short' ? 'active' : ''}`}
                data-direction="short"
                role="button"
                tabIndex={0}
                onClick={() => setDraft({ direction: 'short' })}
              >
                <span className="op-dir-arrow">↘</span>
                <span>Short · Sell</span>
              </div>
            </div>
          </div>
        ) : null}
        {draft.symbol && continueDisabled && !showGkPanel ? (
          <div className="gk-bar neutral">
            <div className="gk-icon gk-icon-svg">
              <GkHintIcon />
            </div>
            <div className="gk-content">
              <div className="gk-text">
                {!symbolSelected ? 'Select an instrument to continue.' : 'Choose a direction to continue.'}
              </div>
            </div>
          </div>
        ) : null}
        <div className="op-cta">
          <div className="op-cta-row">
            <Link className="btn btn-outline" to="/">
              Cancel
            </Link>
            <button
              type="button"
              className={`btn btn-full ${continueDisabled ? 'btn-disabled' : 'btn-primary'}`}
              disabled={continueDisabled}
              onClick={() => {
                if (continueDisabled || !draft.direction || !meta || !draft.symbol) return;
                const q2 = Sim.getQuote(draft.symbol);
                if (!q2) return;
                const entry = q2.last;
                const slDist = meta.pip * 13;
                const sl = draft.direction === 'long' ? entry - slDist : entry + slDist;
                const tpDist = meta.pip * 26;
                const tp = draft.direction === 'long' ? entry + tpDist : entry - tpDist;
                const riskUsd = (st.balance * draft.riskPct) / 100;
                setRiskInput(String(draft.riskPct));
                setDraft({ step: 2, entry, sl, tp, riskUsd });
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </>
    );
  }

  if (draft.step === 2 && meta && draft.entry != null && draft.sl != null && draft.tp != null && draft.direction && gk) {
    const riskUsdNow = (st.balance * draft.riskPct) / 100;
    const positionLots = calc.units / 100000;
    const lotsLabel = `${fmt(positionLots, 2)} lots`;
    const priceSuffix = entryPriceSuffix(draft.symbol);
    const projectedDayPct =
      st.balance > 0 ? ((st.dailyPnL + calc.tpProfit) / st.balance) * 100 : 0;
    const dayQualifies = calc.tpProfit <= 0 || projectedDayPct >= st.rules.minDailyGain - 0.0001;
    const slPipsRounded = Math.round(calc.slDistPips * 100) / 100;
    const slPipsText =
      Math.abs(slPipsRounded - Math.round(slPipsRounded)) < 0.001
        ? `${Math.round(slPipsRounded)}`
        : slPipsRounded.toFixed(1);
    return (
      <>
        <div className="op-head">
          <div className="op-title">Order entry · {draft.symbol}</div>
          <div className="op-step">Step 2 of 4</div>
        </div>
        {showGkPanel ? <OpGkPanel gk={panelGk} accountDailyLossBar={accountDailyLossBar} dailyBlocked={dailyBlocked} /> : null}
        <div className="op-section op-risk-mode">
          <div className="op-section-label">Risk mode</div>
          <div className="op-seg">
            <span
              className={`op-seg-item ${draft.riskMode === 'percent' ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setDraft({ riskMode: 'percent', riskUsd: (st.balance * draft.riskPct) / 100 })}
            >
              % of account
            </span>
            <span className="op-seg-item op-seg-item-disabled" aria-disabled="true">
              $ amount · Coming Soon
            </span>
          </div>
          <div className="op-risk-value-card">
            <input
              className="op-risk-value-input"
              type="number"
              min={0.05}
              max={25}
              step={0.01}
              value={riskInput}
              onChange={(e) => {
                setRiskInput(e.target.value);
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v) && v > 0 && v <= 100) {
                  setDraft({ riskPct: v, riskUsd: (st.balance * v) / 100, riskMode: 'percent' });
                }
              }}
              onBlur={() => {
                const v = parseFloat(riskInput);
                if (Number.isNaN(v) || v <= 0 || v > 100) {
                  setRiskInput(String(draft.riskPct));
                }
              }}
              aria-label="Risk percent of account"
            />
            <span className="op-risk-value-suffix" aria-hidden="true">
              %
            </span>
          </div>
          <div className="op-risk-estimate">≈ ${fmt(riskUsdNow, 2)}</div>
        </div>
        <div className="op-trade-fields">
          <p className="op-field-hint" style={{ marginBottom: 8 }}>
            Price levels for {draft.symbol}
          </p>
          <div className="op-field-row op-trade-fields-primary">
            <div className="op-field">
              <span className="op-field-label">Stop loss</span>
              <input
                className="op-field-input"
                type="text"
                inputMode="decimal"
                value={slField.input}
                onFocus={slField.focus}
                onChange={(e) =>
                  slField.change(
                    e.target.value,
                    (v) => setDraft({ sl: v }),
                    (v) =>
                      draft.direction === 'long'
                        ? v < (draft.entry ?? 0)
                        : v > (draft.entry ?? 0),
                  )
                }
                onBlur={() =>
                  slField.blur(
                    (v) => setDraft({ sl: v }),
                    (v) =>
                      draft.direction === 'long'
                        ? v < (draft.entry ?? 0)
                        : v > (draft.entry ?? 0),
                  )
                }
              />
            </div>
            <div className="op-field">
              <span className="op-field-label">Take profit</span>
              <input
                className="op-field-input"
                type="text"
                inputMode="decimal"
                value={tpField.input}
                onFocus={tpField.focus}
                onChange={(e) =>
                  tpField.change(
                    e.target.value,
                    (v) => setDraft({ tp: v }),
                    (v) =>
                      draft.direction === 'long'
                        ? v > (draft.entry ?? 0)
                        : v < (draft.entry ?? 0),
                  )
                }
                onBlur={() =>
                  tpField.blur(
                    (v) => setDraft({ tp: v }),
                    (v) =>
                      draft.direction === 'long'
                        ? v > (draft.entry ?? 0)
                        : v < (draft.entry ?? 0),
                  )
                }
              />
            </div>
          </div>
          <div className="op-field op-trade-fields-entry">
            <span className="op-field-label">Entry price</span>
            <div className="op-entry-price-card">
              <input
                className="op-entry-price-input"
                type="text"
                inputMode="decimal"
                value={entryField.input}
                onFocus={entryField.focus}
                onChange={(e) => entryField.change(e.target.value, (v) => setDraft({ entry: v }))}
                onBlur={() => entryField.blur((v) => setDraft({ entry: v }))}
                aria-label={`Entry price${priceSuffix ? ` in ${priceSuffix === '$' ? 'USD' : priceSuffix}` : ''}`}
              />
              {priceSuffix ? (
                <span className="op-entry-price-suffix" aria-hidden="true">
                  {priceSuffix}
                </span>
              ) : null}
            </div>
            <span className="op-lots-secondary">{lotsLabel}</span>
          </div>
        </div>
        <div className="op-kpi-list op-summary-card">
          <div className="op-kpi">
            <span className="op-kpi-l">Dollar risk</span>
            <span className="op-kpi-v">${fmt(calc.riskUsd, 2)}</span>
          </div>
          <div className="op-kpi">
            <span className="op-kpi-l">Position size</span>
            <span className="op-kpi-v op-kpi-v-muted">{lotsLabel}</span>
          </div>
          <div className="op-kpi">
            <span className="op-kpi-l">SL distance</span>
            <span className="op-kpi-v">{slPipsText} pips</span>
          </div>
          <div className="op-kpi">
            <span className="op-kpi-l">Risk : reward</span>
            <span className="op-kpi-v">{calc.rr > 0 ? `1 : ${calc.rr.toFixed(2)}` : '—'}</span>
          </div>
          <div className="op-kpi">
            <span className="op-kpi-l">Day qualification</span>
            <span className={`op-kpi-v ${dayQualifies ? 'success' : 'warn'}`}>
              {dayQualifies ? 'Qualifies' : 'Does not qualify'}
            </span>
          </div>
        </div>
        <div className="op-cta">
          <div className="op-cta-row">
            <button type="button" className="btn btn-outline" onClick={() => setDraft({ step: 1, entry: null, sl: null, tp: null })}>
              Back
            </button>
            <button
              type="button"
              className={`btn btn-full ${orderBlocked ? 'btn-disabled' : 'btn-primary'}`}
              disabled={orderBlocked}
              onClick={() => setDraft({ step: 3 })}
            >
              Continue
            </button>
          </div>
        </div>
      </>
    );
  }

  if (draft.step === 3 && meta && draft.entry != null && draft.sl != null && draft.tp != null && draft.direction && gk) {
    return (
      <>
        <div className="op-head">
          <div className="op-title">Review &amp; Confirm</div>
          <div className="op-step">Step 3 of 4</div>
        </div>
        {showGkPanel ? <OpGkPanel gk={panelGk} accountDailyLossBar={accountDailyLossBar} dailyBlocked={dailyBlocked} /> : null}
        <div className="op-review-head">
          <PairIcon iconClass={meta.iconClass} label={meta.short} />
          <div className="op-review-head-meta">
            <div className="op-review-head-title">{draft.symbol}</div>
            <div className="op-review-head-sub">{meta.name}</div>
          </div>
          <span className={`tag ${draft.direction === 'long' ? 'success' : 'danger'}`}>{draft.direction.toUpperCase()}</span>
        </div>
        <div className="review-summary">
          <div className="review-summary-head">Order summary</div>
          <div className="review-row">
            <span className="review-row-l">Entry (market)</span>
            <span className="review-row-v">{draft.entry.toFixed(meta.decimals)}</span>
          </div>
          <div className="review-row">
            <span className="review-row-l">Stop loss</span>
            <span className="review-row-v danger">{draft.sl.toFixed(meta.decimals)}</span>
          </div>
          <div className="review-row">
            <span className="review-row-l">Take profit</span>
            <span className="review-row-v success">{draft.tp.toFixed(meta.decimals)}</span>
          </div>
          <div className="review-row">
            <span className="review-row-l">Position size</span>
            <span className="review-row-v">{fmt(calc.units, 0)} units</span>
          </div>
          <div className="review-row">
            <span className="review-row-l">Risk · Reward</span>
            <span className="review-row-v">
              ${fmt(calc.riskUsd, 2)} · ${fmt(calc.tpProfit, 2)}
            </span>
          </div>
          <div className="review-row">
            <span className="review-row-l">R : R</span>
            <span className="review-row-v">{calc.rr > 0 ? `1 : ${calc.rr.toFixed(2)}` : '—'}</span>
          </div>
        </div>
        <div className="review-disclaimer">
          Demo execution simulates broker latency (~200ms), fills with slippage between 0 and 1.5 pips where applicable, and
          applies the stated commission model. No live accounts or real funds are involved; this screen is for training and
          evaluation only.
        </div>
        <div className="op-cta">
          <div className="op-cta-row">
            <button type="button" className="btn btn-outline" onClick={() => setDraft({ step: 2 })}>
              ← Back
            </button>
            <button
              type="button"
              className={`btn btn-full ${orderBlocked ? 'btn-disabled' : 'btn-success'}`}
              disabled={orderBlocked}
              onClick={onExecute}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Execute {draft.direction === 'long' ? 'Long' : 'Short'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="op-head">
      <div className="op-title">Order entry</div>
      <div className="op-step">…</div>
    </div>
  );
}
