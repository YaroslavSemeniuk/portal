import { SEED_RULES } from './data';
import { evaluate, type OrderForm } from './gatekeeper';
import type { GKState, GkResult } from './types';

function probeOrderForm(state: GKState): OrderForm {
  const balance = state.balance;
  return {
    riskUsd: Math.max(1, balance * 0.01),
    effectiveRiskUsd: Math.max(1, balance * 0.01),
    sl: 1,
    expectedDayProfit: balance * 0.01,
    rewardRatio: 2,
  };
}

/** Gatekeeper run with a nominal order — used before full SL/TP entry exists. */
export function probeGatekeeper(state: GKState, now = Date.now()): GkResult {
  return evaluate(probeOrderForm(state), state, now);
}

export interface RulesActiveSummary {
  activeCount: number;
  total: number;
  blocked: { id: string; title: string }[];
  warned: { id: string; title: string }[];
}

/** Snapshot of the 8 preset rules against current account + a nominal probe order. */
export function getRulesActiveSummary(state: GKState, now = Date.now()): RulesActiveSummary {
  const { checks } = evaluate(probeOrderForm(state), state, now);
  const byId = new Map(checks.map((c) => [c.id, c]));

  const blocked: { id: string; title: string }[] = [];
  const warned: { id: string; title: string }[] = [];
  let activeCount = 0;

  for (const rule of SEED_RULES) {
    const check = byId.get(rule.id);
    if (!check) {
      activeCount++;
      continue;
    }
    if (check.severity === 'block') {
      blocked.push({ id: rule.id, title: rule.title });
      continue;
    }
    activeCount++;
    if (check.severity === 'warn' || check.severity === 'softblock') {
      warned.push({ id: rule.id, title: rule.title });
    }
  }

  return { activeCount, total: SEED_RULES.length, blocked, warned };
}

export function formatRulesActiveSubtitle(summary: RulesActiveSummary): string {
  const { activeCount, total, blocked, warned } = summary;
  if (blocked.length === 1) {
    return `${activeCount} of ${total} rules active — ${blocked[0].title} is blocking`;
  }
  if (blocked.length > 1) {
    return `${activeCount} of ${total} rules active — ${blocked.length} rules blocking`;
  }
  if (warned.length === 1) {
    return `${activeCount} of ${total} rules active — ${warned[0].title} needs attention`;
  }
  if (warned.length > 1) {
    return `${activeCount} of ${total} rules active — ${warned.length} warnings`;
  }
  return `${activeCount} of ${total} rules active — checked on every order`;
}
