import type { Direction } from './types';

export interface TradeDraft {
  step: 1 | 2 | 3;
  symbol: string | null;
  direction: Direction | null;
  riskMode: 'percent' | 'usd';
  riskPct: number;
  riskUsd: number;
  entry: number | null;
  sl: number | null;
  tp: number | null;
  search: string;
}

export const defaultTradeDraft = (): TradeDraft => ({
  step: 1,
  symbol: null,
  direction: null,
  riskMode: 'percent',
  riskPct: 1.0,
  riskUsd: 0,
  entry: null,
  sl: null,
  tp: null,
  search: '',
});
