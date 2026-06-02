import { DAILY_LOSS_WARN_USAGE_PCT } from './riskMetrics';
import { Sim } from './sim';
import { getState, resetStore, setState } from './store';
import type { GKState } from './types';

export type DemoScenarioId =
  | 'reset'
  | 'dailyNormal'
  | 'dailyAmber'
  | 'dailyLocked'
  | 'dailyHighUsage'
  | 'rulesFirmUpdate'
  | 'rulesAgeStale'
  | 'rulesOk'
  | 'newsSoon';

export interface DemoScenarioGroup {
  label: string;
  scenarios: DemoScenarioDef[];
}

export interface DemoScenarioDef {
  id: DemoScenarioId;
  label: string;
  requiresRules?: boolean;
}

export interface DemoScenarioHelpers {
  resetDraft: () => void;
  toast: (msg: string, kind?: 'success' | 'error' | 'info') => void;
}

/** Clears demo state and opens the pre-rules landing screen (Enter Demo). */
export function resetDemoSession(resetDraft: () => void): void {
  Sim.stop();
  resetStore();
  resetDraft();
  sessionStorage.removeItem('gk-session-notice-dismissed');
  const entryUrl = `${import.meta.env.BASE_URL}#/entry`;
  window.location.replace(entryUrl);
}

export const DEMO_SCENARIO_GROUPS: DemoScenarioGroup[] = [
  {
    label: 'Daily loss',
    scenarios: [
      { id: 'dailyNormal', label: 'Normal' },
      { id: 'dailyAmber', label: 'Amber (~85%)' },
      { id: 'dailyLocked', label: 'Locked' },
      { id: 'dailyHighUsage', label: 'High usage (~88%)' },
    ],
  },
  {
    label: 'Rules',
    scenarios: [
      { id: 'rulesFirmUpdate', label: 'Firm update', requiresRules: true },
      { id: 'rulesAgeStale', label: '31+ days old', requiresRules: true },
      { id: 'rulesOk', label: 'Rules OK', requiresRules: true },
    ],
  },
  {
    label: 'News',
    scenarios: [{ id: 'newsSoon', label: 'News in ~22m', requiresRules: true }],
  },
];

function dailyCapUsd(st: GKState): number {
  return st.balance * (st.rules.dailyLoss / 100);
}

function applyDailyPnL(usageFraction: number): void {
  const st = getState();
  const cap = dailyCapUsd(st);
  setState({ dailyPnL: usageFraction <= 0 ? 0 : -cap * usageFraction });
}

export function applyDemoScenario(id: DemoScenarioId, helpers: DemoScenarioHelpers): void {
  const { resetDraft, toast } = helpers;

  if (id === 'reset') {
    if (!window.confirm('Reset all demo state? Journal, balance and rules will revert to seed values.')) return;
    toast('Demo reset — starting fresh.', 'info');
    resetDemoSession(resetDraft);
    return;
  }

  const st = getState();

  switch (id) {
    case 'dailyNormal':
      applyDailyPnL(0);
      toast('Demo: daily P&L reset to normal.', 'info');
      break;
    case 'dailyAmber':
      applyDailyPnL(DAILY_LOSS_WARN_USAGE_PCT / 100);
      toast('Demo: daily loss at amber warning (~85%).', 'info');
      break;
    case 'dailyLocked':
      applyDailyPnL(1.02);
      toast('Demo: daily loss limit locked.', 'info');
      break;
    case 'dailyHighUsage':
      applyDailyPnL(0.88);
      toast('Demo: ~88% of daily allowance used — open Trade step 2 to see projection warning.', 'info');
      break;
    case 'rulesFirmUpdate':
      setState({ rulesEpoch: st.rulesEpoch + 1, rulesLoadedAt: Date.now() });
      toast('Demo: firm published a ruleset update — re-confirm to continue trading.', 'info');
      break;
    case 'rulesAgeStale':
      setState({ confirmedAt: Date.now() - 31 * 86400000 });
      toast('Demo: rules marked as 31+ days old.', 'info');
      break;
    case 'rulesOk': {
      const now = Date.now();
      setState({ confirmedAt: now, confirmedRulesEpoch: st.rulesEpoch });
      toast('Demo: rules marked fresh (stale cleared).', 'info');
      break;
    }
    case 'newsSoon':
      setState({ nextImpactNewsAt: Date.now() + 22 * 60 * 1000 });
      toast('Demo: high-impact news in ~22 minutes.', 'info');
      break;
    default:
      break;
  }
}

export function isDemoScenarioDisabled(
  scenario: DemoScenarioDef,
  st: GKState,
): boolean {
  return scenario.requiresRules === true && !st.rulesConfirmed;
}
