import type { GKState } from './types';

/** Daily loss used as % of the daily loss cap (0–100+). */
export function dailyLossUsagePct(state: GKState): number {
  const { balance, dailyPnL, rules } = state;
  if (balance <= 0) return 0;
  const dailyLossPct = dailyPnL < 0 ? (Math.abs(dailyPnL) / balance) * 100 : 0;
  return Math.min(100, (dailyLossPct / rules.dailyLoss) * 100);
}

export function dailyLossBarTier(usagePct: number): 'success' | 'warn' | 'danger' {
  if (usagePct >= 90) return 'danger';
  if (usagePct >= 70) return 'warn';
  return 'success';
}

export function dailyLossBarClass(tier: 'success' | 'warn' | 'danger'): string {
  if (tier === 'danger') return 'full';
  if (tier === 'warn') return 'warn';
  return 'success';
}

export function dailyLossValueClass(tier: 'success' | 'warn' | 'danger'): string {
  if (tier === 'danger') return 'danger';
  if (tier === 'warn') return 'alert';
  return '';
}

export function isDailyLossBlocked(state: GKState): boolean {
  return dailyLossUsagePct(state) >= 100;
}

export function remainingDailyLossUsd(state: GKState): number {
  const cap = state.balance * (state.rules.dailyLoss / 100);
  const used = Math.abs(Math.min(0, state.dailyPnL));
  return Math.max(0, cap - used);
}

/** Demo: next calendar-day reset at local midnight. */
export function nextDailyLossResetLabel(now = Date.now()): string {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function drawdownUsagePct(state: GKState): number {
  const peak = Math.max(state.equityHighWaterMark ?? state.startingBalance, state.balance);
  if (peak <= 0) return 0;
  const ddPct = Math.max(0, ((peak - state.balance) / peak) * 100);
  return Math.min(100, (ddPct / state.rules.drawdownLim) * 100);
}
