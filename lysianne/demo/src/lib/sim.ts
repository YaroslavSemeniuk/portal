import { generateInitialCandles, INSTRUMENTS, round } from './data';
import type { Candle, Instrument, Quote } from './types';

const TICK_MS = 1500;

interface SimInstrumentState {
  meta: Instrument;
  candles: Candle[];
  bid: number;
  ask: number;
  last: number;
  prev: number;
  sessionOpen: number;
  candleStart: number;
}

const instruments: Record<string, SimInstrumentState> = {};
let tickInterval: ReturnType<typeof setInterval> | null = null;
const listeners: Record<string, Array<(p: unknown) => void>> = {};

function gauss(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function init(): void {
  INSTRUMENTS.forEach((inst) => {
    const candles = generateInitialCandles(inst.symbol, 4320);
    const last = candles[candles.length - 1];
    const current = last.close;
    instruments[inst.symbol] = {
      meta: inst,
      candles,
      bid: round(current - (inst.spread * inst.pip) / 2, inst.decimals),
      ask: round(current + (inst.spread * inst.pip) / 2, inst.decimals),
      last: current,
      prev: last.open,
      sessionOpen: candles[Math.max(0, candles.length - 60)].close,
      candleStart: last.time,
    };
  });
}

function tick(): void {
  const nowSec = Math.floor(Date.now() / 1000);
  Object.keys(instruments).forEach((sym) => {
    const s = instruments[sym];
    const inst = s.meta;
    const drift = gauss() * inst.volatility;
    let newLast = s.last + drift;
    newLast = Math.max(newLast, inst.basePrice * 0.5);
    s.prev = s.last;
    s.last = round(newLast, inst.decimals);
    s.bid = round(s.last - (inst.spread * inst.pip) / 2, inst.decimals);
    s.ask = round(s.last + (inst.spread * inst.pip) / 2, inst.decimals);

    const lastCandle = s.candles[s.candles.length - 1];
    if (nowSec - lastCandle.time >= 60) {
      s.candles.push({
        time: lastCandle.time + 60,
        open: lastCandle.close,
        high: Math.max(lastCandle.close, s.last),
        low: Math.min(lastCandle.close, s.last),
        close: s.last,
      });
      if (s.candles.length > 6000) s.candles.shift();
    } else {
      lastCandle.close = s.last;
      lastCandle.high = Math.max(lastCandle.high, s.last);
      lastCandle.low = Math.min(lastCandle.low, s.last);
    }
    emit('tick', {
      symbol: sym,
      bid: s.bid,
      ask: s.ask,
      last: s.last,
      prev: s.prev,
      candle: s.candles[s.candles.length - 1],
    });
  });
  emit('tick:any', {});
}

function emit(name: string, payload: unknown): void {
  (listeners[name] || []).forEach((cb) => {
    try {
      cb(payload);
    } catch (e) {
      console.error(e);
    }
  });
}

init();

export const Sim = {
  start(): void {
    if (tickInterval) return;
    tickInterval = setInterval(tick, TICK_MS);
  },

  stop(): void {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = null;
  },

  getQuote(sym: string): Quote | null {
    const s = instruments[sym];
    if (!s) return null;
    const changeAbs = s.last - s.sessionOpen;
    const changePct = (changeAbs / s.sessionOpen) * 100;
    return { symbol: sym, bid: s.bid, ask: s.ask, last: s.last, prev: s.prev, changeAbs, changePct };
  },

  getCandles(sym: string): Candle[] {
    return instruments[sym]?.candles || [];
  },

  getAggregatedCandles(sym: string, tfMinutes: number): Candle[] {
    const base = Sim.getCandles(sym);
    if (!tfMinutes || tfMinutes <= 1) return base.slice();
    const tfSec = tfMinutes * 60;
    const buckets: Candle[] = [];
    let current: Candle | null = null;
    for (let i = 0; i < base.length; i++) {
      const c = base[i];
      const bucketTime = Math.floor(c.time / tfSec) * tfSec;
      if (!current || current.time !== bucketTime) {
        if (current) buckets.push(current);
        current = { time: bucketTime, open: c.open, high: c.high, low: c.low, close: c.close };
      } else {
        current.high = Math.max(current.high, c.high);
        current.low = Math.min(current.low, c.low);
        current.close = c.close;
      }
    }
    if (current) buckets.push(current);
    return buckets;
  },

  getCurrentBucket(sym: string, tfMinutes: number): Candle | null {
    const base = Sim.getCandles(sym);
    if (!base.length) return null;
    if (!tfMinutes || tfMinutes <= 1) return base[base.length - 1];
    const tfSec = tfMinutes * 60;
    const lastBucketTime = Math.floor(base[base.length - 1].time / tfSec) * tfSec;
    let bucket: Candle | null = null;
    for (let i = base.length - 1; i >= 0; i--) {
      const c = base[i];
      if (c.time < lastBucketTime) break;
      if (!bucket) {
        bucket = { time: lastBucketTime, open: c.open, high: c.high, low: c.low, close: c.close };
      } else {
        bucket.open = c.open;
        bucket.high = Math.max(bucket.high, c.high);
        bucket.low = Math.min(bucket.low, c.low);
      }
    }
    return bucket;
  },

  getMeta(sym: string): Instrument | undefined {
    return instruments[sym]?.meta;
  },

  getRecentCloses(sym: string, n: number): number[] {
    const c = Sim.getCandles(sym);
    return c.slice(-n).map((x) => x.close);
  },

  simulateFill(sym: string, requestedPrice: number, direction: 'long' | 'short'): { fill: number; slippagePips: number } {
    const s = instruments[sym];
    if (!s) return { fill: requestedPrice, slippagePips: 0 };
    const inst = s.meta;
    const hasSlip = Math.random() < 0.4;
    if (!hasSlip) return { fill: requestedPrice, slippagePips: 0 };
    const pips = Math.random() * 1.5;
    const dir = direction === 'long' ? 1 : -1;
    const fill = round(requestedPrice + dir * pips * inst.pip, inst.decimals);
    return { fill, slippagePips: round(pips, 2) };
  },

  on(name: string, cb: (p: unknown) => void): () => void {
    if (!listeners[name]) listeners[name] = [];
    listeners[name].push(cb);
    return () => {
      listeners[name] = listeners[name].filter((x) => x !== cb);
    };
  },
};
