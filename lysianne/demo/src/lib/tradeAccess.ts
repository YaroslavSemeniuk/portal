import { isDailyLossBlocked } from './riskMetrics';
import { isTradingBlocked } from './store';
import { formatNewsTime, isInsideNewsBlock, newsBlockEndTime } from './news';
import type { GKState } from './types';

export function isNewTradeBlocked(state: GKState, now = Date.now()): boolean {
  return isDailyLossBlocked(state) || isTradingBlocked(state) || isInsideNewsBlock(state, now);
}

export function getNewTradeBlockTitle(state: GKState, now = Date.now()): string {
  if (isTradingBlocked(state)) {
    return 'Re-confirm your rules on the Rules tab to resume trading.';
  }
  if (isDailyLossBlocked(state)) {
    return 'Daily loss limit reached.';
  }
  if (isInsideNewsBlock(state, now)) {
    const end = newsBlockEndTime(state);
    return end
      ? `News restriction active. Trading resumes at ${formatNewsTime(end)}.`
      : 'News restriction active. No new trades during the news window.';
  }
  return '';
}
