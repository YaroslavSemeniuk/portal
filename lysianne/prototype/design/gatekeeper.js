/* Gatekeeper · Rule evaluation */
(function (root) {
  'use strict';

  function evaluate(form, state) {
    var rules = state.rules;
    var balance = state.balance;
    var dailyPnL = state.dailyPnL || 0;
    var checks = [];

    var riskUsd = form.riskUsd || 0;
    var riskPct = balance > 0 ? (riskUsd / balance) * 100 : 0;
    checks.push({
      id: 'maxRisk',
      label: 'Max risk per trade ' + rules.maxRisk + '%',
      pass: riskPct <= rules.maxRisk + 0.001,
      severity: riskPct > rules.maxRisk ? 'block' : 'pass',
      val: riskPct.toFixed(2) + '%',
      message: riskPct > rules.maxRisk
        ? 'Order risk ' + riskPct.toFixed(2) + '% exceeds the ' + rules.maxRisk + '% per-trade cap.'
        : null
    });

    var hasSL = !!form.sl && form.sl > 0;
    checks.push({
      id: 'slRequired',
      label: 'Stop-loss required',
      pass: hasSL,
      severity: hasSL ? 'pass' : 'block',
      val: hasSL ? 'SL set' : 'Missing',
      message: !hasSL ? 'Stop-loss is required on every order.' : null
    });

    var dailyLossPct = dailyPnL < 0 ? Math.abs(dailyPnL) / balance * 100 : 0;
    var dailyLossUsage = dailyLossPct / rules.dailyLoss;
    var dailySev = dailyLossUsage >= 1 ? 'block' : (dailyLossUsage >= 0.85 ? 'warn' : 'pass');
    checks.push({
      id: 'dailyLoss',
      label: 'Daily loss cap ' + rules.dailyLoss + '%',
      pass: dailySev !== 'block',
      severity: dailySev,
      val: dailyLossPct.toFixed(2) + '%',
      message: dailySev === 'block'
        ? 'Daily loss cap reached. Trading is locked until reset.'
        : (dailySev === 'warn' ? 'Approaching daily loss cap (' + dailyLossPct.toFixed(2) + '% / ' + rules.dailyLoss + '%).' : null)
    });

    var totalDrawdown = state.startingBalance > 0
      ? Math.max(0, (state.startingBalance - balance) / state.startingBalance * 100)
      : 0;
    var ddSev = totalDrawdown >= rules.drawdownLim ? 'block' : (totalDrawdown >= rules.drawdownLim * 0.85 ? 'warn' : 'pass');
    checks.push({
      id: 'drawdownLim',
      label: 'Total drawdown ' + rules.drawdownLim + '%',
      pass: ddSev !== 'block',
      severity: ddSev,
      val: totalDrawdown.toFixed(2) + '%',
      message: ddSev === 'block' ? 'Account has hit the maximum drawdown limit.' : null
    });

    var newsActive = !!form.newsActive;
    checks.push({
      id: 'newsWindow',
      label: 'News window ±' + rules.newsWindow + 'm',
      pass: !newsActive,
      severity: newsActive ? 'block' : 'pass',
      val: newsActive ? 'High-impact news' : 'Clear',
      message: newsActive ? 'Trading is paused inside the news window.' : null
    });

    var projectedDayPct = ((dailyPnL + (form.expectedDayProfit || 0)) / state.balance) * 100;
    var biggestDayPct = (state.biggestDayPct || 0);
    var consSev = projectedDayPct > rules.consistency * 0.95 ? 'softblock' : (projectedDayPct > rules.consistency * 0.7 ? 'warn' : 'pass');
    checks.push({
      id: 'consistency',
      label: 'Consistency cap ' + rules.consistency + '%',
      pass: consSev !== 'softblock',
      severity: consSev,
      val: projectedDayPct.toFixed(1) + '%',
      message: consSev === 'softblock'
        ? 'This trade would push today\u2019s profit above the consistency cap of ' + rules.consistency + '%.'
        : null
    });

    checks.push({
      id: 'minDays',
      label: 'Trading days ' + state.daysCounted + ' / ' + rules.minDays,
      pass: true,
      severity: 'pass',
      val: state.daysCounted + ' / ' + rules.minDays,
      message: null
    });

    checks.push({
      id: 'minDailyGain',
      label: 'Min daily gain ' + rules.minDailyGain + '%',
      pass: true,
      severity: 'pass',
      val: rules.minDailyGain + '% required',
      message: null
    });

    var blockers = checks.filter(function (c) { return c.severity === 'block'; });
    var softblocks = checks.filter(function (c) { return c.severity === 'softblock'; });
    var warns = checks.filter(function (c) { return c.severity === 'warn'; });

    var severity = 'clear';
    var title = 'All clear — order is within rules';
    var text = 'Position size, SL and risk all comply with your prop firm preset.';

    if (blockers.length) {
      severity = 'block';
      title = 'Order blocked';
      text = blockers.map(function (b) { return b.message; }).filter(Boolean).join(' ');
    } else if (softblocks.length) {
      severity = 'softblock';
      title = 'Soft-block — review required';
      text = softblocks.map(function (b) { return b.message; }).filter(Boolean).join(' ');
    } else if (warns.length) {
      severity = 'warn';
      title = 'Warning — close to a limit';
      text = warns.map(function (b) { return b.message; }).filter(Boolean).join(' ');
    }

    return { severity: severity, title: title, text: text, checks: checks };
  }

  root.Gatekeeper = { evaluate: evaluate };
})(window);
