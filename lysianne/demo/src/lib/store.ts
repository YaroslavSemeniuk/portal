import { cloneState } from './data';
import type { GKState } from './types';

const STORAGE_KEY = 'gk-design-state-v3';
const REMOVED_SYMBOLS = new Set(['BTC/USDT', 'USD/JPY']);

const listeners = new Set<() => void>();

function load(): GKState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const key of ['gk-design-state-v2', 'gk-design-state-v1']) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          const parsed = JSON.parse(legacy) as GKState;
          localStorage.removeItem(key);
          return parsed;
        }
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GKState;
    return parsed || null;
  } catch {
    return null;
  }
}

function save(state: GKState): void {
  try {
    const copy = { ...state };
    delete (copy as unknown as { candles?: unknown }).candles;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
  } catch {
    /* ignore */
  }
}

function withDerivedMetrics(s: GKState): GKState {
  const peak = Math.max(s.equityHighWaterMark ?? s.startingBalance, s.balance);
  const next: GKState = {
    ...s,
    equityHighWaterMark: peak,
  };
  const dd = peak > 0 ? ((peak - next.balance) / peak) * 100 : 0;
  if (dd >= next.rules.drawdownLim) {
    next.sessionTerminated = true;
  }
  return next;
}

function normalize(loaded: GKState): GKState {
  const base = cloneState();
  if (!loaded.rules || loaded.rules.minDailyGain == null) {
    return base;
  }
  const journal = (loaded.journal || [])
    .filter((j) => !REMOVED_SYMBOLS.has(j.symbol))
    .map((j) => ({
      ...j,
      outcome: j.outcome === 'win' || j.outcome === 'loss' || j.outcome === 'pending' ? j.outcome : 'win',
    }));
  const positions = (loaded.positions || []).filter((p) => !REMOVED_SYMBOLS.has(p.symbol));
  const merged: GKState = {
    ...base,
    ...loaded,
    rules: { ...base.rules, ...loaded.rules },
    journal,
    positions,
    equityHighWaterMark: Math.max(
      loaded.equityHighWaterMark ?? loaded.startingBalance ?? base.startingBalance,
      loaded.balance ?? base.balance,
    ),
    rulesEpoch: loaded.rulesEpoch ?? base.rulesEpoch,
    confirmedRulesEpoch: loaded.confirmedRulesEpoch ?? (loaded.rulesConfirmed ? loaded.rulesEpoch ?? 1 : 0),
    nextImpactNewsAt:
      loaded.nextImpactNewsAt != null && loaded.nextImpactNewsAt > Date.now() - 86400000
        ? loaded.nextImpactNewsAt
        : base.nextImpactNewsAt,
    sessionTerminated: loaded.sessionTerminated ?? false,
  };
  return withDerivedMetrics(merged);
}

let state: GKState = normalize(load() || cloneState());

function notify(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error(e);
    }
  });
}

export function getState(): GKState {
  return state;
}

export function setState(patch: Partial<GKState>): void {
  state = withDerivedMetrics({ ...state, ...patch });
  save(state);
  notify();
}

export function updateState(fn: (s: GKState) => Partial<GKState> | void): void {
  const next = fn(state);
  if (next && Object.keys(next).length) {
    state = withDerivedMetrics({ ...state, ...next });
    save(state);
    notify();
  } else {
    save(state);
    notify();
  }
}

export function subscribeStore(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function resetStore(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('gk-design-state-v2');
  localStorage.removeItem('gk-design-state-v1');
  state = withDerivedMetrics(cloneState());
  save(state);
  notify();
}

export function rulesNeedReconfirm(s: GKState): boolean {
  return s.rulesConfirmed && s.rulesEpoch > s.confirmedRulesEpoch;
}

const STALE_DAYS = 30;
const MS_PER_DAY = 86400000;

export function isRulesStaleByAge(s: GKState): boolean {
  if (!s.rulesConfirmed || s.confirmedAt == null) return false;
  return Date.now() - s.confirmedAt > STALE_DAYS * MS_PER_DAY;
}

export function isTradingBlocked(s: GKState): boolean {
  return isRulesStaleByAge(s) || rulesNeedReconfirm(s);
}
