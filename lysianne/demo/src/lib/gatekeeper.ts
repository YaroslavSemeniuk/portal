import { isInsideNewsBlock, newsProximityMinutesUntilBlock, formatNewsTime, newsBlockEndTime } from './news';
import { nextDailyLossResetLabel, remainingDailyLossUsd } from './riskMetrics';
import type { GkCheck, GkResult, GKState } from './types';

export interface OrderForm {
  riskUsd: number;
  /** Includes round-trip commission estimate when sizing is known */
  effectiveRiskUsd: number;
  sl: number;
  expectedDayProfit: number;
  /** R:R ratio e.g. 3 for 1:3 — used in consistency warning copy */
  rewardRatio?: number;
}

function drawdownFromPeakPct(state: GKState): number {
  const peak = Math.max(state.equityHighWaterMark || state.startingBalance, state.balance);
  if (peak <= 0) return 0;
  return Math.max(0, ((peak - state.balance) / peak) * 100);
}

export function evaluate(form: OrderForm, state: GKState, now = Date.now()): GkResult {
  const { rules } = state;
  const { balance } = state;
  const dailyPnL = state.dailyPnL || 0;
  const checks: GkCheck[] = [];

  const riskUsd = form.riskUsd || 0;
  const effectiveRiskUsd = form.effectiveRiskUsd > 0 ? form.effectiveRiskUsd : riskUsd;
  const riskPctNominal = balance > 0 ? (riskUsd / balance) * 100 : 0;
  const riskPctEffective = balance > 0 ? (effectiveRiskUsd / balance) * 100 : 0;

  checks.push({
    id: 'maxRisk',
    label: `Max risk per trade ${rules.maxRisk}%`,
    pass: riskPctEffective <= rules.maxRisk + 0.001,
    severity: riskPctEffective > rules.maxRisk ? 'block' : 'pass',
    val: `${riskPctNominal.toFixed(2)}% (+fees ${riskPctEffective.toFixed(2)}%)`,
    message:
      riskPctEffective > rules.maxRisk
        ? `Fee-adjusted risk ${riskPctEffective.toFixed(2)}% exceeds the ${rules.maxRisk}% per-trade cap.`
        : null,
  });

  const hasSL = !!form.sl && form.sl > 0;
  checks.push({
    id: 'slRequired',
    label: 'Stop-loss required',
    pass: hasSL,
    severity: hasSL ? 'pass' : 'block',
    val: hasSL ? 'SL set' : 'Missing',
    message: !hasSL ? 'Stop-loss is required on every order.' : null,
  });

  const dailyLossPct = dailyPnL < 0 ? (Math.abs(dailyPnL) / balance) * 100 : 0;
  const dailyLossUsage = dailyLossPct / rules.dailyLoss;
  const dailySev = dailyLossUsage >= 1 ? 'block' : dailyLossUsage >= 0.7 ? 'warn' : 'pass';
  const resetLabel = nextDailyLossResetLabel(now);
  checks.push({
    id: 'dailyLoss',
    label: `Daily loss cap ${rules.dailyLoss}%`,
    pass: dailySev !== 'block',
    severity: dailySev,
    val: `${dailyLossPct.toFixed(2)}%`,
    message:
      dailySev === 'block'
        ? `Daily loss limit reached. You have used 100% of your daily allowance. Trading is locked until your daily limit resets at ${resetLabel} (demo: use Reset demo).`
        : dailySev === 'warn'
          ? `Approaching daily loss limit — you have used ${(dailyLossUsage * 100).toFixed(0)}% of your daily allowance. ${Math.max(0, 100 - dailyLossUsage * 100).toFixed(0)}% remaining.`
          : null,
  });

  const remainingAllowance = remainingDailyLossUsd(state);
  if (remainingAllowance > 0 && riskUsd > 0 && dailySev !== 'block') {
    const tradeSharePct = (riskUsd / remainingAllowance) * 100;
    if (tradeSharePct >= 50) {
      checks.push({
        id: 'dailyLossTradeShare',
        label: 'Daily loss projection',
        pass: true,
        severity: 'warn',
        val: `${tradeSharePct.toFixed(0)}%`,
        message: `This trade will use ${tradeSharePct.toFixed(0)}% of your remaining daily loss allowance.`,
      });
    }
  }

  const totalDrawdown = drawdownFromPeakPct(state);
  const ddSev =
    totalDrawdown >= rules.drawdownLim ? 'block' : totalDrawdown >= rules.drawdownLim * 0.85 ? 'warn' : 'pass';
  checks.push({
    id: 'drawdownLim',
    label: `Total drawdown ${rules.drawdownLim}% (from peak)`,
    pass: ddSev !== 'block',
    severity: ddSev,
    val: `${totalDrawdown.toFixed(2)}%`,
    message: ddSev === 'block' ? 'Account has hit the maximum drawdown limit.' : null,
  });

  const newsActive = isInsideNewsBlock(state, now);
  checks.push({
    id: 'newsWindow',
    label: `News window ±${rules.newsWindow}m`,
    pass: !newsActive,
    severity: newsActive ? 'block' : 'pass',
    val: newsActive ? 'High-impact news' : 'Clear',
    message: newsActive
      ? `News restriction active. High-impact EUR/USD news. Trading resumes at ${formatNewsTime(newsBlockEndTime(state) ?? now)}.`
      : null,
  });

  const proximityMin = newsProximityMinutesUntilBlock(state, now);
  if (proximityMin != null && !newsActive) {
    const resumeAt = newsBlockEndTime(state);
    checks.push({
      id: 'newsProximity',
      label: 'News proximity',
      pass: true,
      severity: 'warn',
      val: `${proximityMin}m`,
      message: `High-impact news in ${proximityMin} minutes. Ensure your position is managed before ${resumeAt ? formatNewsTime(resumeAt) : 'the event'}.`,
    });
  }

  const projectedDayPct = balance > 0 ? ((dailyPnL + (form.expectedDayProfit || 0)) / balance) * 100 : 0;
  const rr = form.rewardRatio && form.rewardRatio > 0 ? form.rewardRatio : 2;
  const consSev =
    projectedDayPct > rules.consistency * 0.95
      ? 'softblock'
      : projectedDayPct > rules.consistency * 0.7
        ? 'warn'
        : 'pass';
  const suggestRr = Math.max(2, Math.floor(rr) - 1);
  checks.push({
    id: 'consistency',
    label: `Consistency cap ${rules.consistency}%`,
    pass: consSev !== 'softblock',
    severity: consSev,
    val: `${projectedDayPct.toFixed(1)}%`,
    message:
      consSev === 'softblock'
        ? `This trade would push today's profit above the consistency cap of ${rules.consistency}%.`
        : consSev === 'warn'
          ? `Letting this trade run to your target would exceed your consistency score ratio. Consider closing at 1:${suggestRr} instead of 1:${rr.toFixed(0)}.`
          : null,
  });

  const daysOk = state.daysCounted >= rules.minDays;
  checks.push({
    id: 'minDays',
    label: `Trading days ${state.daysCounted} / ${rules.minDays}`,
    pass: daysOk,
    severity: daysOk ? 'pass' : 'warn',
    val: `${state.daysCounted} / ${rules.minDays}`,
    message: daysOk ? null : `Only ${state.daysCounted} of ${rules.minDays} required trading days logged toward payout qualification.`,
  });

  const minGainOk =
    (form.expectedDayProfit || 0) <= 0 || projectedDayPct >= rules.minDailyGain - 0.0001;
  checks.push({
    id: 'minDailyGain',
    label: `Min daily gain ${rules.minDailyGain}%`,
    pass: minGainOk,
    severity: minGainOk ? 'pass' : 'warn',
    val: `+${projectedDayPct.toFixed(1)}% target`,
    message: minGainOk
      ? null
      : `Day qualification: your target of +${projectedDayPct.toFixed(1)}% does not meet the minimum gain required (${rules.minDailyGain}% required). Adjust or proceed knowing this day will not count.`,
  });

  const blockers = checks.filter((c) => c.severity === 'block');
  const softblocks = checks.filter((c) => c.severity === 'softblock');

  let severity: GkResult['severity'] = 'clear';
  let title = 'All clear — order is within rules';
  let text = 'Position size, SL and risk all comply with your prop firm preset.';

  if (blockers.length) {
    severity = 'block';
    title = blockers.length > 1 ? `${blockers.length} rules block this order` : 'Order blocked';
    text = blockers.map((b) => b.message).filter(Boolean).join(' ');
  } else if (softblocks.length) {
    severity = 'softblock';
    title = 'Soft-block — review required';
    text = softblocks.map((b) => b.message).filter(Boolean).join(' ');
  }

  return { severity, title, text, checks };
}
