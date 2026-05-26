export const TF_OPTIONS = [
  { id: '1m', min: 1 },
  { id: '5m', min: 5 },
  { id: '15m', min: 15 },
  { id: '1h', min: 60 },
  { id: '4h', min: 240 },
  { id: '1D', min: 1440 },
] as const;

export type ChartSeriesType = 'candles' | 'line' | 'area';

export const CHART_COLORS = {
  text: 'rgba(255,255,255,0.55)',
  grid: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.06)',
  cross: 'rgba(181,160,255,0.55)',
  up: '#40C475',
  down: '#DF1C41',
  line: '#B5A0FF',
  lineHi: '#C7B4FF',
  entry: '#B5A0FF',
  sl: '#DF1C41',
  tp: '#40C475',
} as const;
