import { Sim } from './sim';
import type { TradeDraft } from './tradeDraft';
import { COMMISSION_USD_PER_LOT_SIDE } from './data';

export interface OrderCalc {
  units: number;
  riskUsd: number;
  riskPct: number;
  tpProfit: number;
  rr: number;
  slDistPips: number;
  /** Estimated round-trip commission for position size (PRD §0.6) */
  commissionRoundTripUsd: number;
  /** Nominal risk + commission, for gatekeeper fee-adjusted cap */
  effectiveRiskUsd: number;
}

export function estimateLots(_symbol: string | null, units: number): number {
  return units / 100000;
}

export function estimateCommissionRoundTripUsd(symbol: string | null, units: number): number {
  const lots = Math.max(0, estimateLots(symbol, units));
  return lots * COMMISSION_USD_PER_LOT_SIDE * 2;
}

export function computeOrder(draft: TradeDraft, balance: number): OrderCalc {
  let riskUsd = draft.riskUsd;
  let riskPct = draft.riskPct;
  if (draft.riskMode === 'percent') riskUsd = (balance * draft.riskPct) / 100;
  else riskPct = (draft.riskUsd / balance) * 100;

  const meta = draft.symbol ? Sim.getMeta(draft.symbol) : undefined;
  if (!meta) {
    return { units: 0, riskUsd, riskPct, tpProfit: 0, rr: 0, slDistPips: 0, commissionRoundTripUsd: 0, effectiveRiskUsd: riskUsd };
  }
  const entry = draft.entry || 0;
  const sl = draft.sl || 0;
  const tp = draft.tp || 0;
  const slDistPrice = Math.abs(entry - sl);
  const slDistPips = slDistPrice / meta.pip;
  const tpDistPrice = Math.abs(tp - entry);
  const rr = slDistPrice > 0 ? tpDistPrice / slDistPrice : 0;
  const pipValuePerUnit = meta.pipValue / 100000;
  const units = slDistPips > 0 ? riskUsd / (slDistPips * pipValuePerUnit) : 0;
  const tpProfit = riskUsd * rr;
  const commissionRoundTripUsd = estimateCommissionRoundTripUsd(draft.symbol, units);
  const effectiveRiskUsd = riskUsd + commissionRoundTripUsd;
  return { units, riskUsd, riskPct, tpProfit, rr, slDistPips, commissionRoundTripUsd, effectiveRiskUsd };
}
