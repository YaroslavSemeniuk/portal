import type { GKState } from './types';

/** True when current time is inside ±newsWindow minutes of the simulated event */
export function isInsideNewsBlock(state: GKState, now = Date.now()): boolean {
  if (state.nextImpactNewsAt == null) return false;
  const w = state.rules.newsWindow * 60 * 1000;
  return Math.abs(now - state.nextImpactNewsAt) <= w;
}

/** Minutes until block starts, when in pre-event proximity window; null otherwise */
export function newsProximityMinutesUntilBlock(state: GKState, now = Date.now()): number | null {
  if (state.nextImpactNewsAt == null) return null;
  const w = state.rules.newsWindow * 60 * 1000;
  const blockStart = state.nextImpactNewsAt - w;
  const warnLeadMs = 60 * 60 * 1000;
  if (now < blockStart - warnLeadMs || now >= blockStart) return null;
  const untilEvent = state.nextImpactNewsAt - now;
  if (untilEvent > 0 && untilEvent <= warnLeadMs) {
    return Math.max(0, Math.ceil(untilEvent / 60000));
  }
  return Math.max(0, Math.ceil((blockStart - now) / 60000));
}

export function newsBlockEndTime(state: GKState): number | null {
  if (state.nextImpactNewsAt == null) return null;
  return state.nextImpactNewsAt + state.rules.newsWindow * 60 * 1000;
}

export function formatNewsTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Dashboard / panel countdown until high-impact news event. */
export function formatNewsCountdown(state: GKState, now = Date.now()): string | null {
  if (state.nextImpactNewsAt == null) return null;
  const diff = state.nextImpactNewsAt - now;
  if (diff <= 0) {
    if (isInsideNewsBlock(state, now)) {
      const end = newsBlockEndTime(state);
      return end ? `In news window · resumes ${formatNewsTime(end)}` : 'In news window';
    }
    return null;
  }
  return `EUR/USD in ${formatDuration(diff)}`;
}
