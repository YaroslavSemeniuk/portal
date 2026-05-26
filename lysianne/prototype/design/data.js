/* Gatekeeper · Seed data */
(function (root) {
  'use strict';

  var INSTRUMENTS = [
    {
      symbol: 'EUR/USD', name: 'Euro / US Dollar',
      iconClass: 'eur', short: 'EUR',
      basePrice: 1.08542, pip: 0.0001, pipValue: 10,
      spread: 0.4, volatility: 0.00018, decimals: 5
    },
    {
      symbol: 'GBP/USD', name: 'British Pound / US Dollar',
      iconClass: 'gbp', short: 'GBP',
      basePrice: 1.26410, pip: 0.0001, pipValue: 10,
      spread: 0.6, volatility: 0.00022, decimals: 5
    },
    {
      symbol: 'BTC/USDT', name: 'Bitcoin / Tether',
      iconClass: 'btc', short: 'BTC',
      basePrice: 67234.50, pip: 1, pipValue: 1,
      spread: 4.2, volatility: 80, decimals: 2
    },
    {
      symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen',
      iconClass: 'usd', short: 'JPY',
      basePrice: 154.215, pip: 0.01, pipValue: 9.2,
      spread: 1.0, volatility: 0.025, decimals: 3
    }
  ];

  var SEED_RULES = [
    { id: 'maxRisk',      title: 'Max risk per trade',     sub: 'Hard cap on $ at risk per single position',         val: '2.0%',     type: 'percent' },
    { id: 'dailyLoss',    title: 'Max daily loss',         sub: 'Lockout if intraday loss exceeds limit',            val: '5.0%',     type: 'percent' },
    { id: 'drawdownLim',  title: 'Total drawdown',         sub: 'Account is failed if equity dips below floor',      val: '10.0%',    type: 'percent' },
    { id: 'slRequired',   title: 'Stop-loss required',     sub: 'Every order must include a hard SL',                val: 'Always',   type: 'flag' },
    { id: 'newsWindow',   title: 'News window',            sub: 'No trading 2m before/after high-impact events',     val: '±2 min',   type: 'time' },
    { id: 'consistency',  title: 'Consistency cap',        sub: 'No single day above 30% of total profit',           val: '30%',      type: 'percent' },
    { id: 'minDays',      title: 'Min trading days',       sub: 'Required to qualify for payout',                    val: '10 days',  type: 'count' },
    { id: 'minDailyGain', title: 'Min daily gain',         sub: 'Day counts only if net result ≥ +1.0%',             val: '1.0%',     type: 'percent' }
  ];

  var SEED_JOURNAL = [
    {
      id: 'TR-8467',
      symbol: 'EUR/USD', direction: 'long',
      entry: 1.08321, exit: 1.08605, sl: 1.08191, tp: 1.08581,
      pnl: 1284.40, pnlPct: 2.43, rr: 2.18, riskUsd: 1056.80,
      slippage: 0.0, durationMin: 47,
      ts: Date.now() - 4 * 86400000,
      outcome: 'win', notes: 'Clean breakout from 4h consolidation. Patience paid off.'
    },
    {
      id: 'TR-8468',
      symbol: 'GBP/USD', direction: 'short',
      entry: 1.26840, exit: 1.26720, sl: 1.27010, tp: 1.26500,
      pnl: -704.00, pnlPct: -1.33, rr: -0.41, riskUsd: 1056.80,
      slippage: 0.3, durationMin: 22,
      ts: Date.now() - 2 * 86400000,
      outcome: 'loss', notes: 'Cut early — momentum stalled at retest. Right call, market kept ranging.'
    },
    {
      id: 'TR-8469',
      symbol: 'BTC/USDT', direction: 'long',
      entry: 66800.00, exit: 67340.00, sl: 66500.00, tp: 67400.00,
      pnl: 540.00, pnlPct: 1.02, rr: 1.80, riskUsd: 300,
      slippage: 1.5, durationMin: 134,
      ts: Date.now() - 1 * 86400000,
      outcome: 'win', notes: ''
    }
  ];

  var INITIAL_STATE = {
    balance: 52840.00,
    startingBalance: 50000,
    dailyPnL: 0,
    drawdown: 0,
    daysCounted: 1,
    minDays: 10,
    rules: {
      maxRisk: 2.0,
      dailyLoss: 5.0,
      drawdownLim: 10.0,
      slRequired: true,
      newsWindow: 2,
      consistency: 30,
      minDailyGain: 1.0,
      minDays: 10
    },
    positions: [],
    journal: SEED_JOURNAL.slice(),
    selected: { symbol: 'EUR/USD', direction: null },
    lastTrade: null,
    rulesConfirmed: false,
    demoState: 'normal',
    confirmedAt: null
  };

  function generateInitialCandles(symbol, count) {
    var inst = INSTRUMENTS.find(function (i) { return i.symbol === symbol; });
    if (!inst) return [];
    var candles = [];
    var now = Math.floor(Date.now() / 60000) * 60;
    var price = inst.basePrice;
    var trendBias = (Math.random() - 0.5) * inst.volatility * 0.3;
    for (var i = count - 1; i >= 0; i--) {
      var ts = now - i * 60;
      var open = price;
      var moves = 8;
      var close = open;
      var high = open, low = open;
      for (var j = 0; j < moves; j++) {
        close += (Math.random() - 0.5 + trendBias / inst.volatility * 0.05) * inst.volatility;
        high = Math.max(high, close);
        low = Math.min(low, close);
      }
      candles.push({ time: ts, open: round(open, inst.decimals), high: round(high, inst.decimals), low: round(low, inst.decimals), close: round(close, inst.decimals) });
      price = close;
      if (i % 25 === 0) trendBias = (Math.random() - 0.5) * inst.volatility * 0.3;
    }
    return candles;
  }

  function round(n, d) {
    var f = Math.pow(10, d);
    return Math.round(n * f) / f;
  }

  root.GK_DATA = {
    INSTRUMENTS: INSTRUMENTS,
    SEED_RULES: SEED_RULES,
    SEED_JOURNAL: SEED_JOURNAL,
    INITIAL_STATE: INITIAL_STATE,
    generateInitialCandles: generateInitialCandles,
    round: round
  };
})(window);
