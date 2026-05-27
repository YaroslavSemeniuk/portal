export type Direction = 'long' | 'short';

export interface Instrument {
  symbol: string;
  name: string;
  iconClass: string;
  short: string;
  basePrice: number;
  pip: number;
  pipValue: number;
  spread: number;
  volatility: number;
  decimals: number;
}

export interface SeedRule {
  id: string;
  title: string;
  sub: string;
  val: string;
  type: string;
}

export interface RulesConfig {
  maxRisk: number;
  dailyLoss: number;
  drawdownLim: number;
  slRequired: boolean;
  newsWindow: number;
  consistency: number;
  minDailyGain: number;
  minDays: number;
}

export interface Position {
  id: string;
  symbol: string;
  direction: Direction;
  requestedEntry: number;
  entry: number;
  sl: number;
  tp: number;
  slippagePips: number;
  units: number;
  riskUsd: number;
  rr: number;
  openedAt: number;
  closedAt?: number;
  exit?: number;
  realizedPnL?: number;
  /** Links open position to a pending journal row created at execute */
  journalEntryId?: string;
}

export interface JournalEntry {
  id: string;
  symbol: string;
  direction: Direction;
  entry: number;
  exit: number;
  sl: number;
  tp: number;
  pnl: number;
  pnlPct: number;
  rr: number;
  riskUsd: number;
  slippage: number;
  durationMin: number;
  ts: number;
  outcome: 'win' | 'loss' | 'pending';
  notes: string;
  emotion?: string;
  setup?: string;
  tags?: string;
}

export interface GKState {
  balance: number;
  startingBalance: number;
  /** Peak balance / equity high-water for trailing drawdown % */
  equityHighWaterMark: number;
  dailyPnL: number;
  drawdown: number;
  daysCounted: number;
  minDays: number;
  rules: RulesConfig;
  positions: Position[];
  journal: JournalEntry[];
  selected: { symbol: string; direction: Direction | null };
  lastTrade: Position | null;
  rulesConfirmed: boolean;
  confirmedAt: number | null;
  /** When the current ruleset (rulesEpoch) was published to the account */
  rulesLoadedAt: number | null;
  /** Bumped when firm ruleset changes; must re-confirm when > confirmedRulesEpoch */
  rulesEpoch: number;
  confirmedRulesEpoch: number;
  /** Simulated high-impact news event time (ms) */
  nextImpactNewsAt: number | null;
  /** When true, trading routes redirect to session-ended */
  sessionTerminated: boolean;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  prev: number;
  changeAbs: number;
  changePct: number;
}

export type GkSeverity = 'clear' | 'warn' | 'block' | 'softblock' | 'neutral';

export interface GkCheck {
  id: string;
  label: string;
  pass: boolean;
  severity: string;
  val: string;
  message: string | null;
}

export interface GkResult {
  severity: GkSeverity;
  title: string;
  text: string;
  checks: GkCheck[];
}
