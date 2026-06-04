import type { GKState } from './types';

/** % of daily cap used before account-level warning UI (matches prototype). */
export const DAILY_LOSS_WARN_USAGE_PCT = 85;

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

export function isDailyLossWarning(state: GKState): boolean {
  const u = dailyLossUsagePct(state);
  return u >= DAILY_LOSS_WARN_USAGE_PCT && u < 100;
}

export function dailyLossAllowanceUsd(state: GKState): number {
  return state.balance * (state.rules.dailyLoss / 100);
}

export function msUntilDailyLossResetUtc(now = Date.now()): number {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next - now);
}

export function formatDailyLossResetCountdown(now = Date.now()): string {
  const totalSec = Math.floor(msUntilDailyLossResetUtc(now) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function dailyLossResetUtcLabel(): string {
  return '00:00 UTC';
}

export function remainingDailyLossUsd(state: GKState): number {
  const cap = state.balance * (state.rules.dailyLoss / 100);
  const used = Math.abs(Math.min(0, state.dailyPnL));
  return Math.max(0, cap - used);
}

/** @deprecated Use dailyLossResetUtcLabel + formatDailyLossResetCountdown */
export function nextDailyLossResetLabel(): string {
  return dailyLossResetUtcLabel();
}

export function drawdownUsagePct(state: GKState): number {
  const { ddPct, drawdownLim } = trailingDrawdownSnapshot(state);
  if (drawdownLim <= 0) return 0;
  return Math.min(100, (ddPct / drawdownLim) * 100);
}

export function trailingDrawdownSnapshot(state: GKState) {
  const peak = Math.max(state.equityHighWaterMark ?? state.startingBalance, state.balance);
  const drawdownLim = state.rules.drawdownLim;
  const ddPct = peak > 0 ? Math.max(0, ((peak - state.balance) / peak) * 100) : 0;
  const ddFloor = peak * (1 - drawdownLim / 100);
  const ddCushion = Math.max(0, state.balance - ddFloor);
  return { peak, ddPct, ddFloor, ddCushion, drawdownLim };
}
