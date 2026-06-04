import { Sim } from './sim';
import type { Instrument, Position, Quote } from './types';

export function fmt(n: number | null | undefined, d: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function signedFmt(n: number | null | undefined, d: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n >= 0 ? '+$' : '-$';
  return sign + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function pnlClass(n: number): string {
  return n > 0 ? 'success' : n < 0 ? 'danger' : '';
}

export function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function formatDateTime(ts: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const d = new Date(ts);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${hh}:${mm} UTC`;
}

export function formatShortDate(ts: number = Date.now()): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const d = new Date(ts);
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function getGreeting(name = 'Alex'): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}`;
}

export function formatDate(): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${hh}:${mm} UTC`;
}

export function computeUnrealized(pos: Position, q: Quote | null): number {
  if (!pos || !q) return 0;
  const meta = Sim.getMeta(pos.symbol);
  if (!meta) return 0;
  const diff = pos.direction === 'long' ? q.last - pos.entry : pos.entry - q.last;
  const pips = diff / meta.pip;
  let pipValuePerUnit = meta.pipValue / 100000;
  if (meta.symbol === 'BTC/USDT') pipValuePerUnit = 1;
  return pips * pipValuePerUnit * pos.units;
}

export function winRate(j: { outcome: string }[]): number {
  const settled = j.filter((r) => r.outcome === 'win' || r.outcome === 'loss');
  if (!settled.length) return 0;
  return Math.round((settled.filter((r) => r.outcome === 'win').length / settled.length) * 100);
}

export function pipValuePerUnit(meta: Instrument): number {
  if (meta.symbol === 'BTC/USDT') return 1;
  return meta.pipValue / 100000;
}

/** Entry price field suffix: $ when quote is USD, otherwise the quote currency code (e.g. EUR, USDT). */
export function entryPriceSuffix(symbol: string | null | undefined): string {
  if (!symbol) return '';
  const slash = symbol.indexOf('/');
  if (slash < 0) return '';
  const quote = symbol.slice(slash + 1).trim().toUpperCase();
  if (quote === 'USD') return '$';
  return quote;
}

export function formatBucketLabel(t: number, tfMin: number): string {
  const d = new Date(t * 1000);
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (tfMin >= 1440) return `${dd} ${mon}`;
  return `${dd} ${mon} · ${hh}:${mm}`;
}
