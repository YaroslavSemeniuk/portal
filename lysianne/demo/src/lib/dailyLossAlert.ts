import { fmt } from './format';
import {
  dailyLossAllowanceUsd,
  dailyLossResetUtcLabel,
  dailyLossUsagePct,
  isDailyLossBlocked,
  isDailyLossWarning,
} from './riskMetrics';
import type { GKState } from './types';

export function dailyLossBlockMessage(state: GKState): string {
  const allowance = dailyLossAllowanceUsd(state);
  return `Daily loss limit reached. You have used 100% of your $${fmt(allowance, 0)} daily allowance. No new trades today.`;
}

export function dailyLossWarnMessage(state: GKState): string {
  const usage = Math.round(dailyLossUsagePct(state));
  const remaining = Math.max(0, 100 - usage);
  return `Approaching daily loss limit — you have used ${usage}% of your daily allowance. ${remaining}% remaining. New trades are still allowed until 100% is used.`;
}

export function dailyLossLockedBannerText(): string {
  return `Daily loss limit reached — 100% used. Resets at ${dailyLossResetUtcLabel()}`;
}

export function shouldShowAccountDailyLossBar(state: GKState): boolean {
  return isDailyLossBlocked(state) || isDailyLossWarning(state);
}
