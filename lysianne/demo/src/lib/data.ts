import type { GKState, Instrument, JournalEntry, SeedRule } from './types';

/** PRD §0.6 — commission per lot per side (round-trip = ×2) */
export const COMMISSION_USD_PER_LOT_SIDE = 3.5;

export const INSTRUMENTS: Instrument[] = [
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    iconClass: 'eur',
    short: 'EUR',
    basePrice: 1.08542,
    pip: 0.0001,
    pipValue: 10,
    spread: 0.4,
    volatility: 0.00018,
    decimals: 5,
  },
  {
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    iconClass: 'gbp',
    short: 'GBP',
    basePrice: 1.2641,
    pip: 0.0001,
    pipValue: 10,
    spread: 0.6,
    volatility: 0.00022,
    decimals: 5,
  },
];

export const SEED_RULES: SeedRule[] = [
  { id: 'maxRisk', title: 'Max risk per trade', sub: 'Hard cap on $ at risk per single position', val: '2.0%', type: 'percent' },
  { id: 'dailyLoss', title: 'Max daily loss', sub: 'Lockout if intraday loss exceeds limit', val: '5.0%', type: 'percent' },
  { id: 'drawdownLim', title: 'Total drawdown', sub: 'Account is failed if equity dips below floor', val: '10.0%', type: 'percent' },
  { id: 'slRequired', title: 'Stop-loss required', sub: 'Every order must include a hard SL', val: 'Always', type: 'flag' },
  { id: 'newsWindow', title: 'News window', sub: 'No trading 2m before/after high-impact events', val: '±2 min', type: 'time' },
  { id: 'consistency', title: 'Consistency cap', sub: 'No single day above 30% of total profit', val: '30%', type: 'percent' },
  { id: 'minDays', title: 'Min trading days', sub: 'Required to qualify for payout', val: '10 days', type: 'count' },
  { id: 'minDailyGain', title: 'Min daily gain', sub: 'Day counts only if net result ≥ +1.0%', val: '1.0%', type: 'percent' },
];

const SEED_JOURNAL: JournalEntry[] = [
  {
    id: 'TR-8467',
    symbol: 'EUR/USD',
    direction: 'long',
    entry: 1.08321,
    exit: 1.08605,
    sl: 1.08191,
    tp: 1.08581,
    pnl: 1284.4,
    pnlPct: 2.43,
    rr: 2.18,
    riskUsd: 1056.8,
    slippage: 0.0,
    durationMin: 47,
    ts: Date.now() - 4 * 86400000,
    outcome: 'win',
    notes: 'Clean breakout from 4h consolidation. Patience paid off.',
  },
  {
    id: 'TR-8468',
    symbol: 'GBP/USD',
    direction: 'short',
    entry: 1.2684,
    exit: 1.2672,
    sl: 1.2701,
    tp: 1.265,
    pnl: -704.0,
    pnlPct: -1.33,
    rr: -0.41,
    riskUsd: 1056.8,
    slippage: 0.3,
    durationMin: 22,
    ts: Date.now() - 2 * 86400000,
    outcome: 'loss',
    notes: 'Cut early — momentum stalled at retest. Right call, market kept ranging.',
  },
  {
    id: 'TR-8469',
    symbol: 'EUR/USD',
    direction: 'long',
    entry: 1.08150,
    exit: 1.08420,
    sl: 1.07990,
    tp: 1.08470,
    pnl: 540.0,
    pnlPct: 1.02,
    rr: 1.69,
    riskUsd: 320,
    slippage: 0.2,
    durationMin: 134,
    ts: Date.now() - 1 * 86400000,
    outcome: 'win',
    notes: '',
  },
];

export const INITIAL_STATE: GKState = {
  balance: 52840.0,
  startingBalance: 52840.0,
  equityHighWaterMark: 52840.0,
  dailyPnL: 0,
  drawdown: 0,
  daysCounted: 1,
  minDays: 10,
  rules: {
    maxRisk: 2.0,
    dailyLoss: 5.0,
    drawdownLim: 10.0,
    slRequired: true,
    newsWindow: 2,
    consistency: 30,
    minDailyGain: 1.0,
    minDays: 10,
  },
  positions: [],
  journal: SEED_JOURNAL.slice(),
  selected: { symbol: 'EUR/USD', direction: null },
  lastTrade: null,
  rulesConfirmed: false,
  confirmedAt: null,
  rulesLoadedAt: null,
  rulesEpoch: 1,
  confirmedRulesEpoch: 0,
  nextImpactNewsAt: Date.now() + 12 * 60 * 1000,
  sessionTerminated: false,
};

export function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function generateInitialCandles(symbol: string, count: number) {
  const inst = INSTRUMENTS.find((i) => i.symbol === symbol);
  if (!inst) return [];
  const candles: { time: number; open: number; high: number; low: number; close: number }[] = [];
  const now = Math.floor(Date.now() / 60000) * 60;
  let price = inst.basePrice;
  let trendBias = (Math.random() - 0.5) * inst.volatility * 0.3;
  for (let i = count - 1; i >= 0; i--) {
    const ts = now - i * 60;
    const open = price;
    const moves = 8;
    let close = open;
    let high = open;
    let low = open;
    for (let j = 0; j < moves; j++) {
      close += (Math.random() - 0.5 + (trendBias / inst.volatility) * 0.05) * inst.volatility;
      high = Math.max(high, close);
      low = Math.min(low, close);
    }
    candles.push({
      time: ts,
      open: round(open, inst.decimals),
      high: round(high, inst.decimals),
      low: round(low, inst.decimals),
      close: round(close, inst.decimals),
    });
    price = close;
    if (i % 25 === 0) trendBias = (Math.random() - 0.5) * inst.volatility * 0.3;
  }
  return candles;
}

export function cloneState(): GKState {
  return JSON.parse(JSON.stringify(INITIAL_STATE)) as GKState;
}
