/* Gatekeeper · Price tick simulator */
(function (root) {
  'use strict';

  var TICK_MS = 1500;
  var CANDLE_MS = 60000;

  var instruments = {};
  var tickInterval = null;
  var listeners = {};

  function init() {
    GK_DATA.INSTRUMENTS.forEach(function (inst) {
      /* 4320 = 3 days of 1m candles → enough granularity for 1D timeframe */
      var candles = GK_DATA.generateInitialCandles(inst.symbol, 4320);
      var last = candles[candles.length - 1];
      var current = last.close;
      instruments[inst.symbol] = {
        meta: inst,
        candles: candles,
        bid: round(current - inst.spread * inst.pip / 2, inst.decimals),
        ask: round(current + inst.spread * inst.pip / 2, inst.decimals),
        last: current,
        prev: last.open,
        sessionOpen: candles[Math.max(0, candles.length - 60)].close,
        candleStart: last.time
      };
    });
  }

  function start() {
    if (tickInterval) return;
    tickInterval = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = null;
  }

  function tick() {
    var nowSec = Math.floor(Date.now() / 1000);
    Object.keys(instruments).forEach(function (sym) {
      var s = instruments[sym];
      var inst = s.meta;
      var drift = gauss() * inst.volatility;
      var newLast = s.last + drift;
      newLast = Math.max(newLast, inst.basePrice * 0.5);
      s.prev = s.last;
      s.last = round(newLast, inst.decimals);
      s.bid = round(s.last - inst.spread * inst.pip / 2, inst.decimals);
      s.ask = round(s.last + inst.spread * inst.pip / 2, inst.decimals);

      var lastCandle = s.candles[s.candles.length - 1];
      if (nowSec - lastCandle.time >= 60) {
        s.candles.push({
          time: lastCandle.time + 60,
          open: lastCandle.close,
          high: Math.max(lastCandle.close, s.last),
          low: Math.min(lastCandle.close, s.last),
          close: s.last
        });
        if (s.candles.length > 6000) s.candles.shift();
      } else {
        lastCandle.close = s.last;
        lastCandle.high = Math.max(lastCandle.high, s.last);
        lastCandle.low = Math.min(lastCandle.low, s.last);
      }
      emit('tick', { symbol: sym, bid: s.bid, ask: s.ask, last: s.last, prev: s.prev, candle: s.candles[s.candles.length - 1] });
    });
    emit('tick:any', {});
  }

  function gauss() {
    var u = 1 - Math.random();
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function round(n, d) {
    var f = Math.pow(10, d);
    return Math.round(n * f) / f;
  }

  function getQuote(sym) {
    var s = instruments[sym];
    if (!s) return null;
    var changeAbs = s.last - s.sessionOpen;
    var changePct = (changeAbs / s.sessionOpen) * 100;
    return { symbol: sym, bid: s.bid, ask: s.ask, last: s.last, prev: s.prev, changeAbs: changeAbs, changePct: changePct };
  }

  function getCandles(sym) {
    return (instruments[sym] || {}).candles || [];
  }

  /* Aggregate the base 1-minute candle stream into a higher timeframe.
     tfMinutes ∈ { 1, 5, 15, 60, 240, 1440 } */
  function getAggregatedCandles(sym, tfMinutes) {
    var base = getCandles(sym);
    if (!tfMinutes || tfMinutes <= 1) return base.slice();
    var tfSec = tfMinutes * 60;
    var buckets = [];
    var current = null;
    for (var i = 0; i < base.length; i++) {
      var c = base[i];
      var bucketTime = Math.floor(c.time / tfSec) * tfSec;
      if (!current || current.time !== bucketTime) {
        if (current) buckets.push(current);
        current = { time: bucketTime, open: c.open, high: c.high, low: c.low, close: c.close };
      } else {
        current.high  = Math.max(current.high, c.high);
        current.low   = Math.min(current.low,  c.low);
        current.close = c.close;
      }
    }
    if (current) buckets.push(current);
    return buckets;
  }

  /* Aggregate just the *current* (last) bucket for a given timeframe.
     Used for live updates in higher TFs. */
  function getCurrentBucket(sym, tfMinutes) {
    var base = getCandles(sym);
    if (!base.length) return null;
    if (!tfMinutes || tfMinutes <= 1) return base[base.length - 1];
    var tfSec = tfMinutes * 60;
    var lastBucketTime = Math.floor(base[base.length - 1].time / tfSec) * tfSec;
    var bucket = null;
    for (var i = base.length - 1; i >= 0; i--) {
      var c = base[i];
      if (c.time < lastBucketTime) break;
      if (!bucket) {
        bucket = { time: lastBucketTime, open: c.open, high: c.high, low: c.low, close: c.close };
      } else {
        bucket.open = c.open;
        bucket.high = Math.max(bucket.high, c.high);
        bucket.low  = Math.min(bucket.low,  c.low);
      }
    }
    return bucket;
  }

  function getMeta(sym) {
    return (instruments[sym] || {}).meta;
  }

  function getRecentCloses(sym, n) {
    var c = getCandles(sym);
    return c.slice(-n).map(function (x) { return x.close; });
  }

  /* Slippage simulator: returns actual fill price */
  function simulateFill(sym, requestedPrice, direction) {
    var s = instruments[sym];
    if (!s) return { fill: requestedPrice, slippagePips: 0 };
    var inst = s.meta;
    var hasSlip = Math.random() < 0.4;
    if (!hasSlip) return { fill: requestedPrice, slippagePips: 0 };
    var pips = (Math.random() * 0.6 + 0.2);
    var dir = (direction === 'long') ? 1 : -1;
    var fill = round(requestedPrice + dir * pips * inst.pip, inst.decimals);
    return { fill: fill, slippagePips: round(pips, 2) };
  }

  function emit(name, payload) {
    (listeners[name] || []).forEach(function (cb) {
      try { cb(payload); } catch (e) { console.error(e); }
    });
  }

  function on(name, cb) {
    if (!listeners[name]) listeners[name] = [];
    listeners[name].push(cb);
    return function () { listeners[name] = listeners[name].filter(function (x) { return x !== cb; }); };
  }

  init();

  root.Sim = {
    start: start, stop: stop,
    getQuote: getQuote,
    getCandles: getCandles,
    getAggregatedCandles: getAggregatedCandles,
    getCurrentBucket: getCurrentBucket,
    getMeta: getMeta,
    getRecentCloses: getRecentCloses,
    simulateFill: simulateFill,
    on: on
  };
})(window);
