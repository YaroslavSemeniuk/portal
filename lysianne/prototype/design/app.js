/* Gatekeeper · Main app controller — prototype-aligned layouts */
(function (root) {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var currentView = 'entry';
  var chart = null, mainSeries = null, mainSeriesType = 'candles';
  var entryLine = null, slLine = null, tpLine = null;
  var chartUnsub = null, postLiveUnsub = null, dashLiveUnsub = null;
  var chartSymbol = null;
  var chartTF = 1;            /* timeframe in minutes: 1, 5, 15, 60, 240, 1440 */

  var TF_OPTIONS = [
    { id: '1m',  min: 1 },
    { id: '5m',  min: 5 },
    { id: '15m', min: 15 },
    { id: '1h',  min: 60 },
    { id: '4h',  min: 240 },
    { id: '1D',  min: 1440 }
  ];

  /* Trade form state for the in-progress order */
  var trade = {
    step: 1,
    symbol: 'EUR/USD',
    direction: null,
    riskMode: 'percent',
    riskPct: 1.0,
    riskUsd: 0,
    entry: null,
    sl: null,
    tp: null,
    search: ''
  };

  var demoMode = 'normal';
  var journalFilter = 'all';

  /* =================================================================
     Router
     ================================================================= */
  function go(view) {
    teardown();
    currentView = view;
    $$('#app > .view').forEach(function (v) { v.hidden = v.dataset.view !== view; });
    render(view);
    window.scrollTo(0, 0);
  }

  function teardown() {
    if (chartUnsub) { chartUnsub(); chartUnsub = null; }
    if (postLiveUnsub) { postLiveUnsub(); postLiveUnsub = null; }
    if (dashLiveUnsub) { dashLiveUnsub(); dashLiveUnsub = null; }
    destroyChart();
  }

  function render(view) {
    if (view === 'entry')     return renderEntry();
    if (view === 'rules')     return renderRules();
    if (view === 'dashboard') return renderDashboard();
    if (view === 'trade')     return renderTrade();
    if (view === 'post')      return renderPost();
    if (view === 'journal')   return renderJournal();
  }

  /* =================================================================
     Shared shell pieces (sidebar / topbar)
     ================================================================= */

  function sidebarHTML(active) {
    var st = Store.get();
    var navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '<path d="M3 12l9-9 9 9M5 10v10h14V10"/>' },
      { id: 'trade',     label: 'Trade',     icon: '<path d="M3 3v18h18M7 14l4-4 4 4 5-7"/>' },
      { id: 'journal',   label: 'Journal',   icon: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 4v16"/>' },
      { id: 'rules',     label: 'Rules',     icon: '<path d="M4 6h16M4 12h16M4 18h10"/>' }
    ];

    var nav = navItems.map(function (n) {
      return '<a class="nav-item ' + (active === n.id ? 'active' : '') + '" href="#" data-go="' + n.id + '">' +
        '<span class="nav-icon"><svg viewBox="0 0 24 24">' + n.icon + '</svg></span>' + n.label +
      '</a>';
    }).join('');

    var dailyLossPct = st.dailyPnL < 0 ? Math.abs(st.dailyPnL) / st.balance * 100 : 0;
    var dailyUsage = Math.min(100, dailyLossPct / st.rules.dailyLoss * 100);
    var ddPct = st.startingBalance > 0 ? Math.max(0, (st.startingBalance - st.balance) / st.startingBalance * 100) : 0;
    var ddBuffer = Math.max(0, st.balance - (st.startingBalance * (1 - st.rules.drawdownLim / 100)));

    var lossClass = dailyUsage >= 100 ? 'full' : dailyUsage >= 85 ? 'warn' : '';
    var lossValClass = dailyUsage >= 100 ? 'danger' : dailyUsage >= 85 ? 'alert' : '';

    return '<aside class="sidebar">' +
      '<div class="logo"><div class="logo-mark">G</div><div class="logo-text">Gatekeeper</div></div>' +
      '<div class="nav-section">Main</div>' +
      nav +
      '<div class="nav-section nav-section-account">Account</div>' +
      '<div class="sb-account">' +
        '<div class="sb-acc-row">' +
          '<div class="sb-acc-head"><span class="sb-acc-l">Daily allowance</span><span class="sb-acc-v ' + lossValClass + '">$' + fmt((st.balance * st.rules.dailyLoss / 100) - Math.abs(Math.min(0, st.dailyPnL)), 0) + ' left</span></div>' +
          '<div class="sb-acc-bar"><div class="sb-acc-fill ' + lossClass + '" style="width:' + dailyUsage + '%"></div></div>' +
        '</div>' +
        '<div class="sb-acc-row">' +
          '<div class="sb-acc-head"><span class="sb-acc-l">Drawdown buffer</span><span class="sb-acc-v">$' + fmt(ddBuffer, 0) + '</span></div>' +
          '<div class="sb-acc-bar"><div class="sb-acc-fill ' + (ddPct >= 0.85 * st.rules.drawdownLim ? 'warn' : '') + '" style="width:' + Math.min(100, ddPct / st.rules.drawdownLim * 100) + '%"></div></div>' +
        '</div>' +
        '<div class="sb-acc-row">' +
          '<div class="sb-acc-head"><span class="sb-acc-l">Trading days</span><span class="sb-acc-v">' + st.daysCounted + ' / ' + st.rules.minDays + '</span></div>' +
          '<div class="sb-acc-bar"><div class="sb-acc-fill" style="width:' + Math.min(100, st.daysCounted / st.rules.minDays * 100) + '%"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="sidebar-footer">' +
        '<div class="user-avatar">A</div>' +
        '<div class="user-info"><div class="u-name">Alex Trader</div><div class="u-mail">demo mode</div></div>' +
      '</div>' +
    '</aside>';
  }

  function topbarHTML() {
    var st = Store.get();
    var dailyLossPct = st.dailyPnL < 0 ? Math.abs(st.dailyPnL) / st.balance * 100 : 0;
    var dailyUsage = Math.min(100, dailyLossPct / st.rules.dailyLoss * 100);
    var ddPct = st.startingBalance > 0 ? Math.max(0, (st.startingBalance - st.balance) / st.startingBalance * 100) : 0;
    var lossPctClass = dailyUsage >= 100 ? 'danger' : dailyUsage >= 85 ? 'alert' : '';
    var lossFillClass = dailyUsage >= 100 ? 'full' : dailyUsage >= 85 ? 'warn' : '';

    return '<header class="topbar">' +
      '<div class="demo-badge">Demo Mode</div>' +
      '<div class="spacer"></div>' +
      '<div class="metric">' +
        '<span class="metric-label">Balance</span>' +
        '<span class="metric-value mono" id="tb-balance">$' + fmt(st.balance, 2) + '</span>' +
      '</div>' +
      '<div class="metric">' +
        '<span class="metric-label">P&amp;L today</span>' +
        '<span class="metric-value mono ' + pnlClass(st.dailyPnL) + '" id="tb-pnl">' + signedFmt(st.dailyPnL, 2) + '</span>' +
      '</div>' +
      '<div class="bar-group">' +
        '<div class="bar-head"><span class="label">Daily loss</span><span class="pct ' + lossPctClass + '" id="tb-loss-pct">' + dailyUsage.toFixed(0) + '%</span></div>' +
        '<div class="bar-track"><div class="bar-fill ' + lossFillClass + '" id="tb-loss-fill" style="width:' + dailyUsage + '%"></div></div>' +
      '</div>' +
      '<div class="bar-group">' +
        '<div class="bar-head"><span class="label">Drawdown</span><span class="pct">' + ddPct.toFixed(1) + '%</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.min(100, ddPct / st.rules.drawdownLim * 100) + '%"></div></div>' +
      '</div>' +
    '</header>';
  }

  /* =================================================================
     ENTRY VIEW
     ================================================================= */
  function renderEntry() {
    var view = $('[data-view="entry"]');
    view.innerHTML = '<div class="frame fullbleed">' +
      '<div class="center-stage">' +
        '<div class="cs-logo">G</div>' +
        '<div class="cs-tag"><span class="dot"></span> Live demo · No real funds</div>' +
        '<h1 class="cs-heading">Trade the right way.<br><span class="accent">No real money required.</span></h1>' +
        '<p class="cs-body">Every prop-firm rule, enforced before you click execute. Discipline is built into the platform — not bolted on with reminders.</p>' +
        '<div class="cs-cta-row">' +
          '<button class="btn btn-primary btn-lg" data-go="rules">' +
            'Enter Demo' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
          '</button>' +
          '<button class="btn btn-ghost btn-lg" data-go="rules">Skip intro</button>' +
        '</div>' +
        '<div class="cs-stats">' +
          '<div class="cs-stat"><div class="cs-stat-val">8</div><div class="cs-stat-l">Rules enforced</div></div>' +
          '<div class="cs-stat"><div class="cs-stat-val">0ms</div><div class="cs-stat-l">Override allowed</div></div>' +
          '<div class="cs-stat"><div class="cs-stat-val">100%</div><div class="cs-stat-l">Audit trail</div></div>' +
        '</div>' +
      '</div>' +
    '</div>';
    bindNav(view);
  }

  /* =================================================================
     RULES VIEW
     ================================================================= */
  function renderRules() {
    var view = $('[data-view="rules"]');
    var rules = GK_DATA.SEED_RULES;

    var rulesHTML = rules.map(function (r) {
      return '<div class="confirm-row">' +
        '<div class="confirm-row-ic">✓</div>' +
        '<div class="confirm-row-body">' +
          '<div class="confirm-row-l">' + r.title + '</div>' +
          '<div class="confirm-row-sub">' + r.sub + '</div>' +
        '</div>' +
        '<div class="confirm-row-v">' + r.val + '</div>' +
      '</div>';
    }).join('');

    view.innerHTML = '<div class="frame fullbleed">' +
      '<div class="center-stage" style="padding:60px 40px;align-items:stretch;text-align:left;max-width:920px;margin:0 auto">' +
        '<div style="text-align:center"><div class="cs-tag"><span class="dot"></span> Step 1 of 2 · Setup</div></div>' +
        '<div style="text-align:center">' +
          '<h1 class="cs-heading" style="font-size:32px;margin:0 auto">Confirm your prop-firm rules</h1>' +
          '<p class="cs-body" style="margin:8px auto 0">Before trading, the platform locks in the ruleset it will enforce. You can re-confirm any time.</p>' +
        '</div>' +
        '<div class="confirm-card" style="position:relative;z-index:1">' +
          '<div class="preset-meta">' +
            '<div>' +
              '<div class="preset-meta-l">Demo Firm — Standard Evaluation</div>' +
              '<div class="preset-meta-r">8 rules · last verified April 6, 2026</div>' +
            '</div>' +
            '<span class="tag primary">Active preset</span>' +
          '</div>' +
          '<div class="confirm-list">' + rulesHTML + '</div>' +
          '<div class="cta-row" style="justify-content:space-between">' +
            '<button class="btn btn-ghost" data-go="entry">← Back</button>' +
            '<div class="cta-row">' +
              '<button class="btn btn-outline">Edit rules</button>' +
              '<button class="btn btn-primary btn-lg" id="confirm-rules-btn">' +
                'Confirm &amp; Continue' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
    bindNav(view);
    var c = $('#confirm-rules-btn', view);
    if (c) c.addEventListener('click', function () {
      Store.set({ rulesConfirmed: true, confirmedAt: Date.now() });
      Sim.start();
      toast('Rules confirmed. Trading enabled.', 'success');
      go('dashboard');
    });
  }

  /* =================================================================
     DASHBOARD VIEW
     ================================================================= */
  function renderDashboard() {
    var view = $('[data-view="dashboard"]');
    var st = Store.get();

    /* Main column */
    var mainHTML =
      '<div class="page-head">' +
        '<div>' +
          '<div class="page-title" id="dash-greeting">Welcome back, Alex</div>' +
          '<div class="page-sub">' + (st.positions.length ? st.positions.length + ' open position' + (st.positions.length > 1 ? 's' : '') : 'Your rules are active. Balance is fresh. Ready when you are.') + '</div>' +
        '</div>' +
        '<div class="page-date" id="dash-date">' + formatDate() + '</div>' +
      '</div>' +

      heroHTML(st) +

      /* Live markets / quick pairs */
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div><div class="panel-title">Live markets</div><div class="panel-sub">Updates every 1.5s · synthetic feed</div></div>' +
          '<div class="panel-meta status-line live">Tick simulator active</div>' +
        '</div>' +
        '<div class="rules" style="grid-template-columns:repeat(3,1fr)">' +
          ['EUR/USD', 'GBP/USD', 'BTC/USDT'].map(function (sym) { return livePairCardHTML(sym); }).join('') +
        '</div>' +
      '</section>' +

      /* Rules */
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div><div class="panel-title">Rules</div><div class="panel-sub">8 / 8 passing · Last verified April 6, 2026</div></div>' +
          '<div class="panel-meta"><span class="dot"></span> Next news: EUR/USD in 2h 14m</div>' +
        '</div>' +
        '<div class="rules">' +
          GK_DATA.SEED_RULES.map(function (r) {
            return '<div class="rule"><span class="rule-check">✓</span><span class="rule-text">' + r.title + '</span><span class="rule-val">' + r.val + '</span></div>';
          }).join('') +
        '</div>' +
      '</section>' +

      /* Open positions */
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">Open positions</div>' +
          (st.positions.length ? '<a class="btn btn-ghost btn-sm" href="#" data-go="post">Manage</a>' : '') +
        '</div>' +
        (st.positions.length
          ? st.positions.map(openPositionRowHTML).join('')
          : emptyOpenPositionsHTML()) +
      '</section>';

    /* Order panel = quick start + quick pairs (like prototype S3) */
    var orderHTML =
      '<div class="op-head">' +
        '<div class="op-title">Order entry</div>' +
        '<div class="op-step">Ready</div>' +
      '</div>' +

      '<div class="op-section">' +
        '<div class="op-section-label">Quick start</div>' +
        '<button class="btn btn-primary btn-full btn-lg" data-go="trade">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>' +
          'New Trade' +
        '</button>' +
      '</div>' +

      '<div class="op-section">' +
        '<div class="op-section-label">Quick pairs</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px" id="op-quick-pairs">' +
          ['EUR/USD', 'GBP/USD', 'USD/JPY'].map(function (sym) { return quickPairRowHTML(sym); }).join('') +
        '</div>' +
      '</div>' +

      '<div class="op-section">' +
        '<div class="op-section-label">Today\u2019s P&amp;L</div>' +
        '<div class="op-kpi-list">' +
          '<div class="op-kpi"><span class="op-kpi-l">Realized</span><span class="op-kpi-v ' + pnlClass(st.dailyPnL) + '" id="op-day-pnl">' + signedFmt(st.dailyPnL, 2) + '</span></div>' +
          '<div class="op-kpi"><span class="op-kpi-l">Trades</span><span class="op-kpi-v">' + st.journal.filter(function (j) { return sameDay(j.ts, Date.now()); }).length + '</span></div>' +
          '<div class="op-kpi"><span class="op-kpi-l">Win rate</span><span class="op-kpi-v">' + winRate(st.journal) + '%</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="op-footer-hint" style="margin-top:auto">Click <strong>+ New Trade</strong> to begin. Your rules will load as you enter parameters.</div>';

    view.innerHTML = '<div class="frame">' + sidebarHTML('dashboard') + topbarHTML() +
      '<main class="main">' + mainHTML + '</main>' +
      '<aside class="orderpanel">' + orderHTML + '</aside>' +
    '</div>' + demoTogglesHTML();

    bindNav(view);
    bindDemoToggle(view);

    /* Live ticks → update prices, sparklines, P&L (rAF batched + throttled) */
    var syms = ['EUR/USD', 'GBP/USD', 'BTC/USDT', 'USD/JPY'];
    drawAllSparklines(view);
    var sparkTickCount = 0;
    var pending = false;
    dashLiveUnsub = Sim.on('tick', function (t) {
      if (syms.indexOf(t.symbol) === -1) return;
      if (document.visibilityState === 'hidden') return;
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        if (currentView !== 'dashboard') return;
        var meta = Sim.getMeta(t.symbol);
        var q = Sim.getQuote(t.symbol);
        $$('[data-pair-price="' + t.symbol + '"]', view).forEach(function (el) {
          el.textContent = q.last.toFixed(meta.decimals);
          flashTick(el, t.last > t.prev);
        });
        $$('[data-pair-chg="' + t.symbol + '"]', view).forEach(function (el) {
          el.textContent = (q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2) + '%';
          el.className = 'pair-price-chg ' + (q.changePct >= 0 ? 'up' : 'down');
        });
        sparkTickCount++;
        if (sparkTickCount % 3 === 0) {
          var sparkEl = $('[data-pair-spark="' + t.symbol + '"]', view);
          if (sparkEl) drawSpark(sparkEl, Sim.getRecentCloses(t.symbol, 30));
        }
        var posList = Store.get().positions;
        for (var i = 0; i < posList.length; i++) {
          var p = posList[i];
          if (p.symbol !== t.symbol) continue;
          var pnl = computeUnrealized(p, q);
          var pnlEl = $('[data-pos-pnl="' + p.id + '"]', view);
          if (pnlEl) {
            pnlEl.textContent = signedFmt(pnl, 2);
            pnlEl.className = 'pc-v mono ' + pnlClass(pnl);
          }
          var markEl = $('[data-pos-mark="' + p.id + '"]', view);
          if (markEl) markEl.textContent = q.last.toFixed(meta.decimals);
        }
      });
    });
  }

  function heroHTML(st) {
    var pnlPct = st.balance > 0 ? (st.dailyPnL / st.balance) * 100 : 0;
    var profitTarget = st.startingBalance * 0.08;
    var profit = Math.max(0, st.balance - st.startingBalance);
    var profitProgress = Math.min(100, (profit / profitTarget) * 100);
    var dayProgress = Math.min(100, (st.daysCounted / st.rules.minDays) * 100);

    return '<section class="hero">' +
      '<div class="hero-block">' +
        '<div class="hero-label">Account balance</div>' +
        '<div class="hero-balance mono" id="hero-balance">$' + fmt(st.balance, 2) + '</div>' +
        '<div class="hero-sub">Evaluation window · Phase 1 · ' + (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2) + '% today</div>' +
      '</div>' +
      '<div class="hero-block mini-stat">' +
        '<div class="hero-label">Trading days</div>' +
        '<div class="mini-stat-val">' + st.daysCounted + '<span class="unit"> / ' + st.rules.minDays + '</span></div>' +
        '<div class="mini-bar"><div class="mini-bar-fill" style="width:' + dayProgress + '%"></div></div>' +
        '<svg class="spark mini-spark neutral" preserveAspectRatio="none" viewBox="0 0 100 36" data-mini-spark="days"></svg>' +
      '</div>' +
      '<div class="hero-block mini-stat">' +
        '<div class="hero-label">Profit target</div>' +
        '<div class="mini-stat-val ' + (profit > 0 ? 'success' : '') + '">$' + fmt(profit, 0) + '<span class="unit"> / $' + fmt(profitTarget, 0) + '</span></div>' +
        '<div class="mini-bar"><div class="mini-bar-fill" style="width:' + profitProgress + '%"></div></div>' +
        '<svg class="spark mini-spark up" preserveAspectRatio="none" viewBox="0 0 100 36" data-mini-spark="profit"></svg>' +
      '</div>' +
    '</section>';
  }

  function livePairCardHTML(sym) {
    var meta = Sim.getMeta(sym);
    var q = Sim.getQuote(sym);
    if (!meta || !q) return '';
    return '<div class="pair-card" style="padding:14px 16px;flex-direction:column;align-items:stretch;gap:10px" data-symbol="' + sym + '" data-pair-card>' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<div class="pair-icon ' + meta.iconClass + '">' + meta.short + '</div>' +
        '<div class="pair-info"><div class="pair-name">' + sym + '</div><div class="pair-spread">spread ' + meta.spread.toFixed(1) + ' pips</div></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end">' +
        '<div class="pair-price-val mono" data-pair-price="' + sym + '">' + q.last.toFixed(meta.decimals) + '</div>' +
        '<div class="pair-price-chg ' + (q.changePct >= 0 ? 'up' : 'down') + '" data-pair-chg="' + sym + '">' + (q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2) + '%</div>' +
      '</div>' +
      '<svg class="spark ' + (q.changePct >= 0 ? 'up' : 'down') + '" preserveAspectRatio="none" viewBox="0 0 100 32" style="height:32px" data-pair-spark="' + sym + '"></svg>' +
    '</div>';
  }

  function quickPairRowHTML(sym) {
    var meta = Sim.getMeta(sym);
    var q = Sim.getQuote(sym);
    if (!meta || !q) return '';
    return '<div class="pair-card" data-symbol="' + sym + '" data-pair-card>' +
      '<div class="pair-icon ' + meta.iconClass + '">' + meta.short + '</div>' +
      '<div class="pair-info"><div class="pair-name">' + sym + '</div><div class="pair-spread">Spread ' + meta.spread.toFixed(1) + ' pips</div></div>' +
      '<div class="pair-price">' +
        '<div class="pair-price-val mono" data-pair-price="' + sym + '">' + q.last.toFixed(meta.decimals) + '</div>' +
        '<div class="pair-price-chg ' + (q.changePct >= 0 ? 'up' : 'down') + '" data-pair-chg="' + sym + '">' + (q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2) + '%</div>' +
      '</div>' +
    '</div>';
  }

  function openPositionRowHTML(p) {
    var meta = Sim.getMeta(p.symbol);
    var q = Sim.getQuote(p.symbol);
    var pnl = computeUnrealized(p, q);
    return '<div class="pos-row">' +
      '<div class="pos-sym">' +
        '<div class="pair-icon ' + meta.iconClass + '">' + meta.short + '</div>' +
        '<div class="pos-sym-info"><div class="pos-sym-name">' + p.symbol + '</div><div class="pos-sym-sub">' + fmt(p.units, 0) + ' units · ' + p.id + '</div></div>' +
      '</div>' +
      '<div class="pos-cell"><span class="pc-l">Side</span><span class="pc-v dir ' + p.direction + '">' + p.direction.toUpperCase() + '</span></div>' +
      '<div class="pos-cell"><span class="pc-l">Entry</span><span class="pc-v">' + p.entry.toFixed(meta.decimals) + '</span></div>' +
      '<div class="pos-cell"><span class="pc-l">Mark</span><span class="pc-v" data-pos-mark="' + p.id + '">' + q.last.toFixed(meta.decimals) + '</span></div>' +
      '<div class="pos-cell"><span class="pc-l">Stop / Target</span><span class="pc-v">' + p.sl.toFixed(meta.decimals) + ' / ' + p.tp.toFixed(meta.decimals) + '</span></div>' +
      '<div class="pos-cell"><span class="pc-l">Unrealized</span><span class="pc-v ' + pnlClass(pnl) + '" data-pos-pnl="' + p.id + '">' + signedFmt(pnl, 2) + '</span></div>' +
      '<button class="pos-action" data-close-pos="' + p.id + '">Close</button>' +
    '</div>';
  }

  function emptyOpenPositionsHTML() {
    return '<div class="empty">' +
      '<div class="empty-illu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><path d="M8 12h8"/></svg></div>' +
      '<div class="empty-title">No open positions</div>' +
      '<div class="empty-sub">Start a new trade to see it here. Your rules will run in real time.</div>' +
    '</div>';
  }

  /* =================================================================
     TRADE VIEW
     ================================================================= */
  function renderTrade() {
    var view = $('[data-view="trade"]');
    var st = Store.get();

    var stepHTML = '<div class="stepper">' +
      stepBox(1, 'Instrument') + '<div class="step-divider"></div>' +
      stepBox(2, 'Risk &amp; SL') + '<div class="step-divider"></div>' +
      stepBox(3, 'Review') +
    '</div>';

    var meta = Sim.getMeta(trade.symbol);
    var q = Sim.getQuote(trade.symbol);

    var mainHTML =
      '<div class="page-head">' +
        '<div>' +
          '<div class="page-title">New trade</div>' +
          '<div class="page-sub">Build the order, watch the gatekeeper react in real time.</div>' +
        '</div>' +
        stepHTML +
      '</div>' +

      '<div class="chart-header">' +
        '<div>' +
          '<div class="chart-pair" id="chart-pair">' + trade.symbol + (trade.direction ? ' <small>· ' + (trade.direction === 'long' ? 'Long ↗' : 'Short ↘') + '</small>' : '') + '</div>' +
          '<div class="chart-price">' +
            '<span class="chart-price-val mono" id="chart-price">' + q.last.toFixed(meta.decimals) + '</span>' +
            '<span class="chart-price-chg ' + (q.changePct >= 0 ? 'up' : 'down') + '" id="chart-chg">' + (q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2) + '%</span>' +
          '</div>' +
        '</div>' +
        '<div class="chart-toolbar">' +
          '<div class="chart-type-toggle" role="tablist" aria-label="Chart type">' +
            '<button class="ct-btn ' + (mainSeriesType === 'candles' ? 'is-on' : '') + '" data-ct="candles" title="Candles">' +
              '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="7" y1="3" x2="7" y2="21"/><rect x="4" y="7" width="6" height="10" rx="1" fill="currentColor" stroke="none"/><line x1="17" y1="3" x2="17" y2="21"/><rect x="14" y="10" width="6" height="8" rx="1"/></svg>' +
            '</button>' +
            '<button class="ct-btn ' + (mainSeriesType === 'line' ? 'is-on' : '') + '" data-ct="line" title="Line">' +
              '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 14 21 6"/></svg>' +
            '</button>' +
            '<button class="ct-btn ' + (mainSeriesType === 'area' ? 'is-on' : '') + '" data-ct="area" title="Area">' +
              '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 19V13L9 7L13 11L21 4V19Z" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="chart-tf" role="tablist" aria-label="Timeframe">' +
            TF_OPTIONS.map(function (o) {
              return '<button class="tf-btn ' + (chartTF === o.min ? 'is-on' : '') + '" data-tf="' + o.min + '">' + o.id + '</button>';
            }).join('') +
          '</div>' +
          '<button class="chart-fit-btn" id="chart-fit" title="Fit content">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 9 4 4 9 4"/><polyline points="20 9 20 4 15 4"/><polyline points="4 15 4 20 9 20"/><polyline points="20 15 20 20 15 20"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<section class="chart-area">' +
        '<div class="chart-canvas" id="chart-canvas"></div>' +
        '<div class="chart-tooltip" id="chart-tooltip" hidden>' +
          '<div class="ct-time" id="ctt-time">—</div>' +
          '<div class="ct-row"><span class="ct-l">O</span><span class="ct-v" id="ctt-o">—</span></div>' +
          '<div class="ct-row"><span class="ct-l">H</span><span class="ct-v" id="ctt-h">—</span></div>' +
          '<div class="ct-row"><span class="ct-l">L</span><span class="ct-v" id="ctt-l">—</span></div>' +
          '<div class="ct-row"><span class="ct-l">C</span><span class="ct-v" id="ctt-c">—</span></div>' +
          '<div class="ct-row ct-chg"><span class="ct-l">Δ</span><span class="ct-v" id="ctt-chg">—</span></div>' +
        '</div>' +
      '</section>';

    var orderHTML = renderOrderPanel();

    view.innerHTML = '<div class="frame">' + sidebarHTML('trade') + topbarHTML() +
      '<main class="main">' + mainHTML + '</main>' +
      '<aside class="orderpanel" id="orderpanel">' + orderHTML + '</aside>' +
    '</div>' + demoTogglesHTML();

    bindNav(view);
    bindDemoToggle(view);
    bindOrderPanel();
    setupChart(trade.symbol);
    bindChartControls(view);
  }

  /* Bind timeframe / chart-type / fit buttons */
  function bindChartControls(view) {
    $$('.tf-btn', view).forEach(function (b) {
      b.addEventListener('click', function () {
        var tf = parseInt(b.dataset.tf, 10) || 1;
        if (tf === chartTF) return;
        chartTF = tf;
        $$('.tf-btn', view).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        setupChart(trade.symbol);
      });
    });
    $$('.ct-btn', view).forEach(function (b) {
      b.addEventListener('click', function () {
        var ct = b.dataset.ct;
        if (ct === mainSeriesType) return;
        mainSeriesType = ct;
        $$('.ct-btn', view).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        setupChart(trade.symbol);
      });
    });
    var fit = $('#chart-fit', view);
    if (fit) fit.addEventListener('click', function () {
      if (chart) { chart.timeScale().fitContent(); }
    });
  }

  function stepBox(n, label) {
    var cls = trade.step === n ? 'active' : (trade.step > n ? 'done' : '');
    return '<div class="step ' + cls + '"><span class="step-num">' + (trade.step > n ? '✓' : n) + '</span> ' + label + '</div>';
  }

  function renderOrderPanel() {
    if (trade.step === 1) return panelStep1();
    if (trade.step === 2) return panelStep2();
    return panelStep3();
  }

  /* Step 1 — Instrument & Direction */
  function panelStep1() {
    var q = trade.search.toLowerCase().trim();
    var matches = GK_DATA.INSTRUMENTS.filter(function (i) {
      return !q || i.symbol.toLowerCase().indexOf(q) !== -1 || i.name.toLowerCase().indexOf(q) !== -1;
    });

    var meta = Sim.getMeta(trade.symbol);
    var quote = Sim.getQuote(trade.symbol);

    var pairList;
    if (matches.length === 0) {
      pairList = '<div class="op-search-empty">No instruments matching <strong>"' + escapeHtml(trade.search) + '"</strong>. Try EUR/USD, GBP/USD, BTC/USDT.</div>';
    } else {
      pairList = '<div class="instrument-list">' +
        matches.map(function (i) { return quickPairRowHTML(i.symbol).replace('class="pair-card"', 'class="pair-card ' + (trade.symbol === i.symbol ? 'selected' : '') + '"'); }).join('') +
      '</div>';
    }

    var dirDisabled = matches.length === 0;
    var continueDisabled = !trade.direction || dirDisabled;

    return '<div class="op-head">' +
        '<div class="op-title">Order entry · ' + trade.symbol + '</div>' +
        '<div class="op-step">Step 1 of 3</div>' +
      '</div>' +

      '<div class="op-section">' +
        '<div class="op-section-label">Instrument</div>' +
        '<div class="op-search">' +
          '<input class="op-search-input" id="op-search" type="text" placeholder="Search pair — e.g. EUR/USD, GBP/USD" value="' + escapeAttr(trade.search) + '">' +
        '</div>' +
        '<div class="op-search-hint">' + (matches.length ? matches.length + ' pair' + (matches.length > 1 ? 's' : '') + ' available' : 'Type to find pairs') + '</div>' +
        pairList +
      '</div>' +

      (matches.length ? '<div class="op-section">' +
        '<div class="op-section-label">Market price</div>' +
        '<div class="op-price-row">' +
          '<div class="op-price-side"><span class="op-price-l">Bid</span><span class="op-price-v mono" data-bid="' + trade.symbol + '">' + quote.bid.toFixed(meta.decimals) + '</span></div>' +
          '<div class="op-price-side" style="text-align:center"><span class="op-spread">' + meta.spread.toFixed(1) + ' pips</span></div>' +
          '<div class="op-price-side" style="text-align:right"><span class="op-price-l">Ask</span><span class="op-price-v mono" data-ask="' + trade.symbol + '">' + quote.ask.toFixed(meta.decimals) + '</span></div>' +
        '</div>' +
      '</div>' : '') +

      '<div class="op-section">' +
        '<div class="op-section-label">Direction</div>' +
        '<div class="op-dir-row">' +
          '<div class="op-dir ' + (dirDisabled ? 'disabled' : '') + ' ' + (trade.direction === 'long' ? 'active' : '') + '" data-direction="long"><span class="op-dir-arrow">↗</span><span>Long · Buy</span></div>' +
          '<div class="op-dir ' + (dirDisabled ? 'disabled' : '') + ' ' + (trade.direction === 'short' ? 'active' : '') + '" data-direction="short"><span class="op-dir-arrow">↘</span><span>Short · Sell</span></div>' +
        '</div>' +
      '</div>' +

      (continueDisabled
        ? '<div class="gk-bar neutral"><div class="gk-icon">·</div><div class="gk-content"><div class="gk-text">' + (matches.length === 0 ? 'No instruments match your search.' : 'Choose a direction to continue.') + '</div></div></div>'
        : '') +

      '<div class="op-cta">' +
        '<div class="op-cta-row">' +
          '<button class="btn btn-outline" data-go="dashboard">Cancel</button>' +
          '<button class="btn ' + (continueDisabled ? 'btn-disabled' : 'btn-primary') + ' btn-full" ' + (continueDisabled ? 'disabled' : '') + ' id="op-continue">Continue</button>' +
        '</div>' +
      '</div>';
  }

  /* Step 2 — Risk & SL */
  function panelStep2() {
    var st = Store.get();
    var meta = Sim.getMeta(trade.symbol);
    var q = Sim.getQuote(trade.symbol);

    if (!trade.entry) trade.entry = q.last;
    if (!trade.sl) {
      var slDist = meta.pip * (meta.symbol === 'BTC/USDT' ? 80 : 13);
      trade.sl = trade.direction === 'long' ? trade.entry - slDist : trade.entry + slDist;
    }
    if (!trade.tp) {
      var tpDist = meta.pip * (meta.symbol === 'BTC/USDT' ? 160 : 26);
      trade.tp = trade.direction === 'long' ? trade.entry + tpDist : trade.entry - tpDist;
    }
    recalcRisk();

    var calc = computeOrder();
    var gk = Gatekeeper.evaluate({ riskUsd: calc.riskUsd, sl: trade.sl, newsActive: false, expectedDayProfit: calc.tpProfit }, st);

    return '<div class="op-head">' +
        '<div class="op-title">' + trade.symbol + ' · ' + (trade.direction === 'long' ? 'Long ↗' : 'Short ↘') + '</div>' +
        '<div class="op-step">Step 2 of 3</div>' +
      '</div>' +

      '<div class="op-section">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<div class="op-section-label">Risk per trade</div>' +
          '<div class="op-seg">' +
            '<span class="op-seg-item ' + (trade.riskMode === 'percent' ? 'active' : '') + '" data-risk-mode="percent">% of account</span>' +
            '<span class="op-seg-item ' + (trade.riskMode === 'usd' ? 'active' : '') + '" data-risk-mode="usd">$ amount</span>' +
          '</div>' +
        '</div>' +
        '<div class="op-slider-row">' +
          '<div class="op-slider-head">' +
            '<span class="op-slider-val mono" id="op-risk-val">' + (trade.riskMode === 'percent' ? trade.riskPct.toFixed(2) + '%' : '$' + fmt(trade.riskUsd, 0)) + '</span>' +
            '<span class="op-field-hint">Limit ' + st.rules.maxRisk + '%</span>' +
          '</div>' +
          '<div class="op-slider-track">' +
            '<div class="op-slider-fill" id="op-risk-fill" style="width:' + Math.min(100, trade.riskPct / st.rules.maxRisk * 100) + '%"></div>' +
            '<input class="op-slider-input" type="range" id="op-risk" min="0.1" max="' + (st.rules.maxRisk * 1.5).toFixed(1) + '" step="0.1" value="' + trade.riskPct + '">' +
          '</div>' +
          '<div class="op-risk-presets">' +
            [0.5, 1.0, 1.5, 2.0].map(function (v) {
              return '<div class="op-risk-preset ' + (Math.abs(trade.riskPct - v) < 0.01 ? 'active' : '') + '" data-risk="' + v + '">' + v.toFixed(1) + '%</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="op-field-row">' +
        '<div class="op-field"><span class="op-field-label">Entry</span><input class="op-field-input" id="op-entry" type="number" step="' + meta.pip + '" value="' + trade.entry.toFixed(meta.decimals) + '"></div>' +
        '<div class="op-field"><span class="op-field-label" style="color:var(--danger)">Stop loss</span><input class="op-field-input" id="op-sl" type="number" step="' + meta.pip + '" value="' + trade.sl.toFixed(meta.decimals) + '"></div>' +
        '<div class="op-field"><span class="op-field-label" style="color:var(--success)">Take profit</span><input class="op-field-input" id="op-tp" type="number" step="' + meta.pip + '" value="' + trade.tp.toFixed(meta.decimals) + '"></div>' +
      '</div>' +

      '<div class="op-kpi-list">' +
        '<div class="op-kpi"><span class="op-kpi-l">Position size</span><span class="op-kpi-v" id="op-size">' + fmt(calc.units, 0) + ' units</span></div>' +
        '<div class="op-kpi"><span class="op-kpi-l">Dollar risk</span><span class="op-kpi-v danger" id="op-risk-usd">$' + fmt(calc.riskUsd, 2) + '</span></div>' +
        '<div class="op-kpi"><span class="op-kpi-l">Reward (TP)</span><span class="op-kpi-v success" id="op-reward">$' + fmt(calc.tpProfit, 2) + '</span></div>' +
        '<div class="op-kpi"><span class="op-kpi-l">SL distance</span><span class="op-kpi-v" id="op-sl-dist">' + calc.slDistPips.toFixed(1) + ' pips</span></div>' +
        '<div class="op-kpi"><span class="op-kpi-l">Risk : reward</span><span class="op-kpi-v" id="op-rr">' + (calc.rr > 0 ? '1 : ' + calc.rr.toFixed(2) : '—') + '</span></div>' +
      '</div>' +

      '<div id="op-gk">' + gkBarHTML(gk) + '</div>' +

      '<div class="op-cta">' +
        '<div class="op-cta-row">' +
          '<button class="btn btn-outline" id="op-back">← Back</button>' +
          '<button class="btn ' + (gk.severity === 'block' ? 'btn-disabled' : 'btn-primary') + ' btn-full" ' + (gk.severity === 'block' ? 'disabled' : '') + ' id="op-continue">' + (gk.severity === 'softblock' ? 'Override & Continue' : 'Review & Continue') + '</button>' +
        '</div>' +
      '</div>';
  }

  /* Step 3 — Review */
  function panelStep3() {
    var st = Store.get();
    var meta = Sim.getMeta(trade.symbol);
    var calc = computeOrder();
    var gk = Gatekeeper.evaluate({ riskUsd: calc.riskUsd, sl: trade.sl, newsActive: false, expectedDayProfit: calc.tpProfit }, st);

    return '<div class="op-head">' +
        '<div class="op-title">Review &amp; Confirm</div>' +
        '<div class="op-step">Step 3 of 3</div>' +
      '</div>' +

      '<div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--c-03);border:1px solid var(--border);border-radius:var(--radius-md)">' +
        '<div class="pair-icon ' + meta.iconClass + '">' + meta.short + '</div>' +
        '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600">' + trade.symbol + '</div><div style="font-size:11px;color:var(--c-06)">' + meta.name + '</div></div>' +
        '<span class="tag ' + (trade.direction === 'long' ? 'success' : 'danger') + '">' + trade.direction.toUpperCase() + '</span>' +
      '</div>' +

      '<div class="review-summary">' +
        '<div class="review-summary-head">Order summary</div>' +
        '<div class="review-row"><span class="review-row-l">Entry (market)</span><span class="review-row-v">' + trade.entry.toFixed(meta.decimals) + '</span></div>' +
        '<div class="review-row"><span class="review-row-l">Stop loss</span><span class="review-row-v danger">' + trade.sl.toFixed(meta.decimals) + '</span></div>' +
        '<div class="review-row"><span class="review-row-l">Take profit</span><span class="review-row-v success">' + trade.tp.toFixed(meta.decimals) + '</span></div>' +
        '<div class="review-row"><span class="review-row-l">Position size</span><span class="review-row-v">' + fmt(calc.units, 0) + ' units</span></div>' +
        '<div class="review-row"><span class="review-row-l">Risk · Reward</span><span class="review-row-v">$' + fmt(calc.riskUsd, 2) + ' · $' + fmt(calc.tpProfit, 2) + '</span></div>' +
        '<div class="review-row"><span class="review-row-l">R : R</span><span class="review-row-v">' + (calc.rr > 0 ? '1 : ' + calc.rr.toFixed(2) : '—') + '</span></div>' +
      '</div>' +

      gkBarHTML(gk) +

      '<div class="review-disclaimer">Demo execution uses simulated fills with realistic slippage. No real funds are used.</div>' +

      '<div class="op-cta">' +
        '<div class="op-cta-row">' +
          '<button class="btn btn-outline" id="op-back">← Back</button>' +
          '<button class="btn ' + (gk.severity === 'block' ? 'btn-disabled' : 'btn-success') + ' btn-full" ' + (gk.severity === 'block' ? 'disabled' : '') + ' id="op-execute">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>' +
            'Execute order' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  function gkBarHTML(gk) {
    var icons = { clear: '✓', warn: '!', block: '✕', softblock: '⚠', neutral: '·' };
    return '<div class="gk-bar ' + gk.severity + '">' +
      '<div class="gk-icon">' + (icons[gk.severity] || '·') + '</div>' +
      '<div class="gk-content">' +
        '<div class="gk-title">' + gk.title + '</div>' +
        '<div class="gk-text">' + gk.text + '</div>' +
      '</div>' +
    '</div>';
  }

  /* Order calc */
  function recalcRisk() {
    var st = Store.get();
    if (trade.riskMode === 'percent') {
      trade.riskUsd = (st.balance * trade.riskPct) / 100;
    } else {
      trade.riskPct = (trade.riskUsd / st.balance) * 100;
    }
  }

  function computeOrder() {
    var meta = Sim.getMeta(trade.symbol);
    var st = Store.get();
    if (trade.riskMode === 'percent') trade.riskUsd = (st.balance * trade.riskPct) / 100;
    else trade.riskPct = (trade.riskUsd / st.balance) * 100;
    var slDistPrice = Math.abs((trade.entry || 0) - (trade.sl || 0));
    var slDistPips = slDistPrice / meta.pip;
    var tpDistPrice = Math.abs((trade.tp || 0) - (trade.entry || 0));
    var rr = slDistPrice > 0 ? tpDistPrice / slDistPrice : 0;
    var pipValuePerUnit = meta.pipValue / 100000;
    if (meta.symbol === 'BTC/USDT') pipValuePerUnit = 1;
    var units = slDistPips > 0 ? trade.riskUsd / (slDistPips * pipValuePerUnit) : 0;
    var tpProfit = trade.riskUsd * rr;
    return { units: units, riskUsd: trade.riskUsd, riskPct: trade.riskPct, tpProfit: tpProfit, rr: rr, slDistPips: slDistPips };
  }

  function bindOrderPanel() {
    var panel = $('#orderpanel');
    if (!panel) return;
    if (trade.step === 1) bindStep1(panel);
    else if (trade.step === 2) bindStep2(panel);
    else if (trade.step === 3) bindStep3(panel);
  }

  function bindStep1(panel) {
    var search = $('#op-search', panel);
    if (search) {
      search.addEventListener('input', debounce(function () {
        trade.search = search.value;
        var pos = search.selectionStart;
        rerenderOrderPanel();
        var s2 = $('#op-search'); if (s2) { s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (e) {} }
      }, 200));
    }
    $$('[data-pair-card]', panel).forEach(function (c) {
      c.addEventListener('click', function () {
        trade.symbol = c.dataset.symbol;
        trade.entry = null; trade.sl = null; trade.tp = null;
        rerenderOrderPanel();
        updateChartSymbol(trade.symbol);
        var p = $('#chart-pair'); if (p) p.innerHTML = trade.symbol + (trade.direction ? ' <small>· ' + (trade.direction === 'long' ? 'Long ↗' : 'Short ↘') + '</small>' : '');
      });
    });
    $$('[data-direction]', panel).forEach(function (d) {
      if (d.classList.contains('disabled')) return;
      d.addEventListener('click', function () {
        trade.direction = d.dataset.direction;
        rerenderOrderPanel();
        var p = $('#chart-pair'); if (p) p.innerHTML = trade.symbol + ' <small>· ' + (trade.direction === 'long' ? 'Long ↗' : 'Short ↘') + '</small>';
      });
    });
    var cont = $('#op-continue', panel);
    if (cont && !cont.disabled) cont.addEventListener('click', function () { trade.step = 2; renderTrade(); });
  }

  function bindStep2(panel) {
    $$('[data-risk-mode]', panel).forEach(function (s) {
      s.addEventListener('click', function () { trade.riskMode = s.dataset.riskMode; rerenderOrderPanel(); });
    });
    var slider = $('#op-risk', panel);
    if (slider) slider.addEventListener('input', function () {
      trade.riskPct = parseFloat(slider.value);
      recalcRisk();
      liveUpdateStep2();
    });
    $$('[data-risk]', panel).forEach(function (p) {
      p.addEventListener('click', function () { trade.riskPct = parseFloat(p.dataset.risk); recalcRisk(); rerenderOrderPanel(); });
    });
    ['op-entry', 'op-sl', 'op-tp'].forEach(function (id) {
      var el = $('#' + id, panel);
      if (el) el.addEventListener('input', debounce(function () {
        var v = parseFloat(el.value);
        if (!isNaN(v) && v > 0) {
          if (id === 'op-entry') trade.entry = v;
          if (id === 'op-sl') trade.sl = v;
          if (id === 'op-tp') trade.tp = v;
          updateChartLines();
          liveUpdateStep2();
        }
      }, 250));
    });
    var back = $('#op-back', panel);
    if (back) back.addEventListener('click', function () { trade.step = 1; renderTrade(); });
    var cont = $('#op-continue', panel);
    if (cont && !cont.disabled) cont.addEventListener('click', function () { trade.step = 3; renderTrade(); });
    updateChartLines();
  }

  function bindStep3(panel) {
    var back = $('#op-back', panel);
    if (back) back.addEventListener('click', function () { trade.step = 2; renderTrade(); });
    var exec = $('#op-execute', panel);
    if (exec && !exec.disabled) exec.addEventListener('click', executeTrade);
  }

  function liveUpdateStep2() {
    var calc = computeOrder();
    var st = Store.get();
    var gk = Gatekeeper.evaluate({ riskUsd: calc.riskUsd, sl: trade.sl, newsActive: false, expectedDayProfit: calc.tpProfit }, st);
    var setText = function (id, v) { var e = $('#' + id); if (e) e.textContent = v; };
    setText('op-size', fmt(calc.units, 0) + ' units');
    setText('op-risk-usd', '$' + fmt(calc.riskUsd, 2));
    setText('op-reward', '$' + fmt(calc.tpProfit, 2));
    setText('op-sl-dist', calc.slDistPips.toFixed(1) + ' pips');
    setText('op-rr', calc.rr > 0 ? '1 : ' + calc.rr.toFixed(2) : '—');
    setText('op-risk-val', trade.riskMode === 'percent' ? trade.riskPct.toFixed(2) + '%' : '$' + fmt(trade.riskUsd, 0));
    var fill = $('#op-risk-fill'); if (fill) fill.style.width = Math.min(100, trade.riskPct / st.rules.maxRisk * 100) + '%';

    var gkWrap = $('#op-gk');
    if (gkWrap) gkWrap.innerHTML = gkBarHTML(gk);

    var contBtn = $('#op-continue');
    if (contBtn) {
      contBtn.disabled = gk.severity === 'block';
      if (gk.severity === 'block') {
        contBtn.classList.add('btn-disabled'); contBtn.classList.remove('btn-primary');
        contBtn.textContent = 'Order blocked';
      } else {
        contBtn.classList.remove('btn-disabled'); contBtn.classList.add('btn-primary');
        contBtn.textContent = gk.severity === 'softblock' ? 'Override & Continue' : 'Review & Continue';
      }
    }
  }

  function rerenderOrderPanel() {
    var panel = $('#orderpanel');
    if (!panel) return;
    panel.innerHTML = renderOrderPanel();
    bindOrderPanel();
  }

  /* =================================================================
     CHART
     ================================================================= */
  /* v2 chart palette */
  var CHART_COLORS = {
    text:    'rgba(255,255,255,0.55)',
    grid:    'rgba(255,255,255,0.05)',
    border:  'rgba(255,255,255,0.06)',
    cross:   'rgba(181,160,255,0.55)',
    up:      '#40C475',
    down:    '#DF1C41',
    line:    '#B5A0FF',
    lineHi:  '#C7B4FF',
    entry:   '#B5A0FF',
    sl:      '#DF1C41',
    tp:      '#40C475'
  };

  function setupChart(sym) {
    var el = $('#chart-canvas');
    if (!el || !window.LightweightCharts) return;
    destroyChart();

    chart = LightweightCharts.createChart(el, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor:  CHART_COLORS.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   11
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid, style: 0 },
        horzLines: { color: CHART_COLORS.grid, style: 0 }
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        scaleMargins: { top: 0.10, bottom: 0.08 }
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 7
      },
      crosshair: {
        mode: 1,
        vertLine: { color: CHART_COLORS.cross, width: 1, style: 2, labelBackgroundColor: '#1A1330' },
        horzLine: { color: CHART_COLORS.cross, width: 1, style: 2, labelBackgroundColor: '#1A1330' }
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true } },
      width: el.clientWidth, height: el.clientHeight || 480
    });

    chartSymbol = sym;
    var candles = Sim.getAggregatedCandles(sym, chartTF);

    if (mainSeriesType === 'candles') {
      mainSeries = chart.addCandlestickSeries({
        upColor:        CHART_COLORS.up,
        downColor:      CHART_COLORS.down,
        borderUpColor:  CHART_COLORS.up,
        borderDownColor:CHART_COLORS.down,
        wickUpColor:    CHART_COLORS.up,
        wickDownColor:  CHART_COLORS.down
      });
      mainSeries.setData(candles);
    } else if (mainSeriesType === 'line') {
      mainSeries = chart.addLineSeries({
        color: CHART_COLORS.line,
        lineWidth: 2,
        priceLineVisible: true,
        priceLineColor: CHART_COLORS.line,
        priceLineStyle: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: CHART_COLORS.lineHi,
        crosshairMarkerBackgroundColor: CHART_COLORS.line
      });
      mainSeries.setData(candles.map(function (c) { return { time: c.time, value: c.close }; }));
    } else { /* area */
      mainSeries = chart.addAreaSeries({
        lineColor:   CHART_COLORS.line,
        topColor:    'rgba(181,160,255,0.45)',
        bottomColor: 'rgba(181,160,255,0)',
        lineWidth:   2,
        priceLineColor: CHART_COLORS.line,
        priceLineStyle: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: CHART_COLORS.lineHi,
        crosshairMarkerBackgroundColor: CHART_COLORS.line
      });
      mainSeries.setData(candles.map(function (c) { return { time: c.time, value: c.close }; }));
    }

    /* Live updates — re-aggregate the active bucket on every tick */
    chartUnsub = Sim.on('tick', function (t) {
      if (t.symbol !== chartSymbol || !mainSeries) return;
      var bucket = Sim.getCurrentBucket(chartSymbol, chartTF);
      if (!bucket) return;
      if (mainSeriesType === 'candles') {
        mainSeries.update({ time: bucket.time, open: bucket.open, high: bucket.high, low: bucket.low, close: bucket.close });
      } else {
        mainSeries.update({ time: bucket.time, value: bucket.close });
      }
      updateChartHeader(t);
    });

    /* Crosshair tooltip */
    var tooltip = $('#chart-tooltip');
    chart.subscribeCrosshairMove(function (param) {
      if (!tooltip) return;
      if (!param || !param.time || !param.point || param.point.x < 0) {
        tooltip.hidden = true; return;
      }
      var data = param.seriesData ? param.seriesData.get(mainSeries) : null;
      if (!data) { tooltip.hidden = true; return; }
      tooltip.hidden = false;

      var meta = Sim.getMeta(chartSymbol);
      var fmtP = function (n) { return (n == null) ? '—' : Number(n).toFixed(meta.decimals); };

      var o, h, l, c;
      if ('open' in data) { o = data.open; h = data.high; l = data.low; c = data.close; }
      else { o = h = l = c = data.value; }

      var change = c - o;
      var changePct = o ? (change / o) * 100 : 0;
      var up = change >= 0;

      $('#ctt-time').textContent = formatBucketLabel(param.time, chartTF);
      $('#ctt-o').textContent = fmtP(o);
      $('#ctt-h').textContent = fmtP(h);
      $('#ctt-l').textContent = fmtP(l);
      $('#ctt-c').textContent = fmtP(c);
      var chgEl = $('#ctt-chg');
      chgEl.textContent = (up ? '+' : '') + change.toFixed(meta.decimals) + ' (' + (up ? '+' : '') + changePct.toFixed(2) + '%)';
      chgEl.className = 'ct-v ' + (up ? 'up' : 'down');

      /* Position tooltip — clamp inside chart area */
      var rect = el.getBoundingClientRect();
      var tw = tooltip.offsetWidth || 140;
      var th = tooltip.offsetHeight || 120;
      var x = param.point.x + 16;
      var y = param.point.y + 16;
      if (x + tw > rect.width  - 8) x = param.point.x - tw - 16;
      if (y + th > rect.height - 8) y = rect.height - th - 8;
      if (x < 8) x = 8;
      if (y < 8) y = 8;
      tooltip.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    });

    updateChartLines();
    updateChartHeader({ symbol: sym, last: Sim.getQuote(sym).last, prev: Sim.getQuote(sym).prev });

    chart.timeScale().fitContent();
    chart.timeScale().scrollToRealTime();
    window.addEventListener('resize', resizeChart);
  }

  function destroyChart() {
    if (chartUnsub) { try { chartUnsub(); } catch (e) {} chartUnsub = null; }
    if (chart) { try { chart.remove(); } catch (e) {} chart = null; }
    mainSeries = null; entryLine = null; slLine = null; tpLine = null;
    var t = document.getElementById('chart-tooltip'); if (t) t.hidden = true;
    window.removeEventListener('resize', resizeChart);
  }

  function resizeChart() {
    var el = $('#chart-canvas');
    if (chart && el) chart.resize(el.clientWidth, el.clientHeight || 480);
  }

  function updateChartSymbol(sym) { setupChart(sym); }

  function formatBucketLabel(t, tfMin) {
    var d = new Date((typeof t === 'number' ? t : t.timestamp || 0) * 1000);
    var dd  = String(d.getDate()).padStart(2, '0');
    var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    var hh  = String(d.getHours()).padStart(2, '0');
    var mm  = String(d.getMinutes()).padStart(2, '0');
    if (tfMin >= 1440) return dd + ' ' + mon;
    return dd + ' ' + mon + ' · ' + hh + ':' + mm;
  }

  function updateChartHeader(t) {
    var meta = Sim.getMeta(t.symbol);
    var q = Sim.getQuote(t.symbol);
    var priceEl = $('#chart-price');
    var chgEl = $('#chart-chg');
    if (priceEl) {
      priceEl.textContent = q.last.toFixed(meta.decimals);
      flashTick(priceEl, t.last > t.prev);
    }
    if (chgEl) {
      chgEl.textContent = (q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2) + '%';
      chgEl.className = 'chart-price-chg ' + (q.changePct >= 0 ? 'up' : 'down');
    }
    /* update bid/ask in step 1 */
    var bidEl = $('[data-bid="' + t.symbol + '"]'); if (bidEl) bidEl.textContent = q.bid.toFixed(meta.decimals);
    var askEl = $('[data-ask="' + t.symbol + '"]'); if (askEl) askEl.textContent = q.ask.toFixed(meta.decimals);
  }

  function updateChartLines() {
    if (!mainSeries || !mainSeries.createPriceLine) return;
    if (entryLine) try { mainSeries.removePriceLine(entryLine); } catch (e) {}
    if (slLine)    try { mainSeries.removePriceLine(slLine);    } catch (e) {}
    if (tpLine)    try { mainSeries.removePriceLine(tpLine);    } catch (e) {}
    entryLine = slLine = tpLine = null;
    if (trade.entry) entryLine = mainSeries.createPriceLine({ price: trade.entry, color: CHART_COLORS.entry, lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'Entry' });
    if (trade.sl)    slLine    = mainSeries.createPriceLine({ price: trade.sl,    color: CHART_COLORS.sl,    lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: 'SL' });
    if (trade.tp)    tpLine    = mainSeries.createPriceLine({ price: trade.tp,    color: CHART_COLORS.tp,    lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: 'TP' });
  }

  /* =================================================================
     EXECUTE
     ================================================================= */
  function executeTrade() {
    var calc = computeOrder();
    var fill = Sim.simulateFill(trade.symbol, trade.entry, trade.direction);
    var pos = {
      id: 'POS-' + Date.now().toString().slice(-6),
      symbol: trade.symbol, direction: trade.direction,
      requestedEntry: trade.entry, entry: fill.fill, sl: trade.sl, tp: trade.tp,
      slippagePips: fill.slippagePips,
      units: calc.units, riskUsd: calc.riskUsd, rr: calc.rr,
      openedAt: Date.now()
    };
    var st = Store.get();
    Store.set({ positions: st.positions.concat([pos]), lastTrade: pos });
    toast('Order filled · ' + trade.symbol + ' ' + trade.direction.toUpperCase(), 'success');
    trade.step = 1; trade.direction = null; trade.entry = null; trade.sl = null; trade.tp = null;
    go('post');
  }

  /* =================================================================
     POST-EXECUTION
     ================================================================= */
  function renderPost() {
    var view = $('[data-view="post"]');
    var st = Store.get();
    var pos = st.positions[0] || st.lastTrade;

    if (!pos) {
      view.innerHTML = '<div class="frame">' + sidebarHTML('') + topbarHTML() +
        '<main class="main">' +
          '<div class="empty" style="padding:80px 20px"><div class="empty-illu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><path d="M8 12h8"/></svg></div><div class="empty-title">No active or recent position</div><div class="empty-sub">Open a new trade to see it here.</div><div style="margin-top:16px"><button class="btn btn-primary" data-go="trade">+ New trade</button></div></div>' +
        '</main>' +
        '<aside class="orderpanel"><div class="op-head"><div class="op-title">Order entry</div><div class="op-step">Ready</div></div><div class="op-section"><button class="btn btn-primary btn-full btn-lg" data-go="trade">+ New Trade</button></div></aside>' +
      '</div>';
      bindNav(view);
      return;
    }

    var meta = Sim.getMeta(pos.symbol);
    var q = Sim.getQuote(pos.symbol);
    var hasSlip = pos.slippagePips > 0;
    var actualRisk = pos.riskUsd * (1 + pos.slippagePips * 0.01);
    var actualRR = pos.rr * (hasSlip ? (1 - pos.slippagePips * 0.02) : 1);
    var isClosed = pos.closedAt;
    var pnlNow = isClosed ? pos.realizedPnL : computeUnrealized(pos, q);

    var headIcon = isClosed ? 'success' : (hasSlip ? 'warn' : 'success');
    var headTitle = isClosed
      ? (pnlNow >= 0 ? 'Position closed · profit booked' : 'Position closed')
      : (hasSlip ? 'Filled with minor slippage' : 'Filled at requested price');

    var mainHTML =
      '<div class="page-head">' +
        '<div>' +
          '<div class="page-title">' + (isClosed ? 'Position closed' : 'Position open') + '</div>' +
          '<div class="page-sub">' + pos.symbol + ' · ' + pos.direction.toUpperCase() + ' · ' + pos.id + '</div>' +
        '</div>' +
        '<div class="cta-row">' +
          '<button class="btn btn-ghost" data-go="dashboard">← Dashboard</button>' +
          (!isClosed ? '<button class="btn btn-danger" id="post-close-top">Close at market</button>' : '<button class="btn btn-primary" data-go="trade">+ New trade</button>') +
        '</div>' +
      '</div>' +

      '<div class="post-card ' + (pnlNow >= 0 ? 'win' : 'loss') + '">' +
        '<div class="post-head">' +
          '<div class="post-head-icon ' + headIcon + '">' + (isClosed ? '✓' : (hasSlip ? '!' : '✓')) + '</div>' +
          '<div>' +
            '<div class="post-head-title">' + headTitle + '</div>' +
            '<div class="post-head-sub">' + (isClosed ? 'Closed at ' + new Date(pos.closedAt).toLocaleTimeString() : 'Opened at ' + new Date(pos.openedAt).toLocaleTimeString()) + ' · simulated fill</div>' +
          '</div>' +
        '</div>' +

        '<div class="post-table">' +
          '<div class="post-table-row head"><div class="l">Field</div><div class="v">Requested</div><div class="v">Estimated</div><div class="v">Actual</div></div>' +
          '<div class="post-table-row"><div class="l">Entry price</div><div class="v">' + pos.requestedEntry.toFixed(meta.decimals) + '</div><div class="v">' + pos.requestedEntry.toFixed(meta.decimals) + '</div><div class="v">' + pos.entry.toFixed(meta.decimals) + '</div></div>' +
          '<div class="post-table-row ' + (hasSlip ? 'slip-alert' : 'slip-ok') + '"><div class="l">Slippage</div><div class="v">0.0 pips</div><div class="v">±0.5 pips</div><div class="v">' + (hasSlip ? '+' + pos.slippagePips.toFixed(2) + ' pips' : '0.0 pips') + '</div></div>' +
          '<div class="post-table-row"><div class="l">Stop loss</div><div class="v">' + pos.sl.toFixed(meta.decimals) + '</div><div class="v">' + pos.sl.toFixed(meta.decimals) + '</div><div class="v">' + pos.sl.toFixed(meta.decimals) + '</div></div>' +
          '<div class="post-table-row"><div class="l">Take profit</div><div class="v">' + pos.tp.toFixed(meta.decimals) + '</div><div class="v">' + pos.tp.toFixed(meta.decimals) + '</div><div class="v">' + pos.tp.toFixed(meta.decimals) + '</div></div>' +
          '<div class="post-table-row"><div class="l">$ Risk</div><div class="v">$' + fmt(pos.riskUsd, 2) + '</div><div class="v">$' + fmt(pos.riskUsd, 2) + '</div><div class="v">$' + fmt(actualRisk, 2) + '</div></div>' +
          '<div class="post-table-row"><div class="l">R : R</div><div class="v">1 : ' + pos.rr.toFixed(2) + '</div><div class="v">1 : ' + pos.rr.toFixed(2) + '</div><div class="v">1 : ' + actualRR.toFixed(2) + '</div></div>' +
        '</div>' +

        (hasSlip
          ? '<div class="gk-bar warn"><div class="gk-icon">!</div><div class="gk-content"><div class="gk-title">Filled with +' + pos.slippagePips.toFixed(2) + ' pips slippage</div><div class="gk-text">Entry executed at <strong>' + pos.entry.toFixed(meta.decimals) + '</strong>. Stop-loss unchanged at <strong>' + pos.sl.toFixed(meta.decimals) + '</strong>. Dollar risk: <strong>$' + fmt(pos.riskUsd, 2) + ' → $' + fmt(actualRisk, 2) + '</strong>. R:R: <strong>1 : ' + pos.rr.toFixed(2) + ' → 1 : ' + actualRR.toFixed(2) + '</strong>. This is normal in live markets.</div></div></div>'
          : '<div class="gk-bar clear"><div class="gk-icon">✓</div><div class="gk-content"><div class="gk-title">No slippage</div><div class="gk-text">Fill matched your requested price exactly. Risk and R:R remain as planned.</div></div></div>') +

        (isClosed
          ? '<div class="gk-bar clear"><div class="gk-icon">✓</div><div class="gk-content"><div class="gk-title">This day counts toward your trading days</div><div class="gk-text">Trading days: <strong>' + st.daysCounted + ' / ' + st.rules.minDays + '</strong>. Net result: <strong class="' + (pnlNow >= 0 ? 'text-success' : 'text-danger') + '">' + signedFmt(pnlNow, 2) + '</strong>.</div></div></div>'
          : '') +

        (!isClosed
          ? '<div style="margin-top:8px">' +
              '<div class="op-section-label" style="margin-bottom:8px">Live position</div>' +
              '<div class="post-position-card">' +
                '<div class="pair-icon ' + meta.iconClass + '" style="width:42px;height:42px">' + meta.short + '</div>' +
                '<div class="pos-cell"><span class="pc-l">Side</span><span class="pc-v dir ' + pos.direction + '">' + pos.direction.toUpperCase() + '</span></div>' +
                '<div class="pos-cell"><span class="pc-l">Entry</span><span class="pc-v">' + pos.entry.toFixed(meta.decimals) + '</span></div>' +
                '<div class="pos-cell"><span class="pc-l">Mark</span><span class="pc-v" id="post-live-mark">' + q.last.toFixed(meta.decimals) + '</span></div>' +
                '<div class="pos-cell"><span class="pc-l">Distance SL/TP</span><span class="pc-v" id="post-live-dist">—</span></div>' +
                '<div class="pos-cell"><span class="pc-l">Unrealized</span><span class="pc-v ' + pnlClass(pnlNow) + '" id="post-live-pnl">' + signedFmt(pnlNow, 2) + '</span></div>' +
                '<button class="pos-action" id="post-close-bottom">Close</button>' +
              '</div>' +
            '</div>'
          : '<div class="cta-row center"><button class="btn btn-ghost" data-go="journal">View in Journal</button><button class="btn btn-primary btn-lg" data-go="dashboard">Back to Dashboard</button></div>') +
      '</div>';

    var orderHTML =
      '<div class="op-head"><div class="op-title">' + (isClosed ? 'Order entry' : 'Manage position') + '</div><div class="op-step">' + (isClosed ? 'Ready' : 'Active') + '</div></div>' +
      (!isClosed
        ? '<div class="op-section">' +
            '<div class="op-section-label">Position summary</div>' +
            '<div class="op-kpi-list">' +
              '<div class="op-kpi"><span class="op-kpi-l">Symbol</span><span class="op-kpi-v">' + pos.symbol + '</span></div>' +
              '<div class="op-kpi"><span class="op-kpi-l">Direction</span><span class="op-kpi-v">' + pos.direction.toUpperCase() + '</span></div>' +
              '<div class="op-kpi"><span class="op-kpi-l">Entry</span><span class="op-kpi-v">' + pos.entry.toFixed(meta.decimals) + '</span></div>' +
              '<div class="op-kpi"><span class="op-kpi-l">Size</span><span class="op-kpi-v">' + fmt(pos.units, 0) + ' units</span></div>' +
              '<div class="op-kpi"><span class="op-kpi-l">Mark</span><span class="op-kpi-v" id="op-live-mark">' + q.last.toFixed(meta.decimals) + '</span></div>' +
              '<div class="op-kpi"><span class="op-kpi-l">Unrealized</span><span class="op-kpi-v ' + pnlClass(pnlNow) + '" id="op-live-pnl">' + signedFmt(pnlNow, 2) + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="op-section">' +
            '<div class="op-section-label">Actions</div>' +
            '<button class="btn btn-danger btn-full" id="post-close-side">Close at market</button>' +
            '<button class="btn btn-ghost btn-full" disabled aria-disabled="true" title="Coming in full version">Modify SL/TP</button>' +
          '</div>'
        : '<div class="op-section">' +
            '<div class="op-section-label">Quick start</div>' +
            '<button class="btn btn-primary btn-full btn-lg" data-go="trade">+ New Trade</button>' +
          '</div>') +
      '<div class="op-footer-hint" style="margin-top:auto">' + (isClosed ? 'Position closed. Ready for the next trade.' : 'Live P&L updates every 1.5s with the simulated price feed.') + '</div>';

    view.innerHTML = '<div class="frame">' + sidebarHTML('') + topbarHTML() +
      '<main class="main">' + mainHTML + '</main>' +
      '<aside class="orderpanel">' + orderHTML + '</aside>' +
    '</div>';

    bindNav(view);
    ['post-close-top', 'post-close-bottom', 'post-close-side'].forEach(function (id) {
      var b = $('#' + id, view);
      if (b) b.addEventListener('click', openCloseConfirmModal);
    });

    if (!isClosed) {
      var pendingPost = false;
      var update = function () {
        var qq = Sim.getQuote(pos.symbol);
        if (!qq) return;
        var pnl = computeUnrealized(pos, qq);
        var dist = pos.direction === 'long'
          ? { sl: ((qq.last - pos.sl) / meta.pip).toFixed(0), tp: ((pos.tp - qq.last) / meta.pip).toFixed(0) }
          : { sl: ((pos.sl - qq.last) / meta.pip).toFixed(0), tp: ((qq.last - pos.tp) / meta.pip).toFixed(0) };
        var setText = function (id, v, cls) { var el = $('#' + id); if (el) { el.textContent = v; if (cls) el.className = el.className.replace(/\s*(success|danger)\s*/g, ' ') + ' ' + cls; } };
        setText('post-live-mark', qq.last.toFixed(meta.decimals));
        setText('post-live-dist', dist.sl + ' / ' + dist.tp + ' pips');
        setText('post-live-pnl', signedFmt(pnl, 2), 'pc-v ' + pnlClass(pnl));
        setText('op-live-mark', qq.last.toFixed(meta.decimals));
        setText('op-live-pnl', signedFmt(pnl, 2), 'op-kpi-v ' + pnlClass(pnl));
      };
      update();
      postLiveUnsub = Sim.on('tick', function (t) {
        if (t.symbol !== pos.symbol) return;
        if (document.visibilityState === 'hidden') return;
        if (pendingPost) return;
        pendingPost = true;
        requestAnimationFrame(function () { pendingPost = false; if (currentView === 'post') update(); });
      });
    }
  }

  /* =================================================================
     CLOSE CONFIRM MODAL
     ================================================================= */
  function openCloseConfirmModal() {
    var st = Store.get();
    var pos = st.positions[0];
    if (!pos) return;
    var meta = Sim.getMeta(pos.symbol);
    var q = Sim.getQuote(pos.symbol);
    var pnl = computeUnrealized(pos, q);
    var pct = (pnl / st.balance) * 100;

    $('#modal-root').innerHTML =
      '<div class="modal-overlay" id="close-modal">' +
        '<div class="modal-card">' +
          '<div class="modal-icon ' + (pnl >= 0 ? 'success' : 'warn') + '">' + (pnl >= 0 ? '✓' : '!') + '</div>' +
          '<div class="modal-title">Close position at market?</div>' +
          '<div class="modal-body">You are about to close <strong>' + pos.symbol + ' ' + pos.direction + '</strong> at market. Current P&amp;L is <strong class="' + (pnl >= 0 ? 'text-success' : 'text-danger') + '">' + signedFmt(pnl, 2) + '</strong> (' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '% of balance).<br><br>This day will count toward your trading days requirement.</div>' +
          '<div class="modal-stats">' +
            '<div class="modal-stat"><div class="ms-l">Entry</div><div class="ms-v">' + pos.entry.toFixed(meta.decimals) + '</div></div>' +
            '<div class="modal-stat"><div class="ms-l">Mark</div><div class="ms-v">' + q.last.toFixed(meta.decimals) + '</div></div>' +
            '<div class="modal-stat"><div class="ms-l">P&amp;L</div><div class="ms-v ' + (pnl >= 0 ? 'success' : 'danger') + '">' + signedFmt(pnl, 2) + '</div></div>' +
          '</div>' +
          '<div class="modal-cta">' +
            '<button class="btn btn-outline" id="close-cancel">Cancel</button>' +
            '<button class="btn btn-primary" id="close-confirm">Close at market</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    $('#close-cancel').addEventListener('click', closeModal);
    $('#close-modal').addEventListener('click', function (e) { if (e.target.id === 'close-modal') closeModal(); });
    $('#close-confirm').addEventListener('click', function () { closePosition(pos); closeModal(); });
  }

  function closeModal() { $('#modal-root').innerHTML = ''; }

  function closePosition(pos) {
    var st = Store.get();
    var q = Sim.getQuote(pos.symbol);
    var pnl = computeUnrealized(pos, q);
    var meta = Sim.getMeta(pos.symbol);

    pos.closedAt = Date.now();
    pos.exit = q.last;
    pos.realizedPnL = pnl;

    var slDist = Math.abs(pos.entry - pos.sl);
    var actualMove = Math.abs(q.last - pos.entry);
    var rrSign = pnl > 0 ? 1 : -1;

    var journalEntry = {
      id: pos.id.replace('POS', 'TR'),
      symbol: pos.symbol, direction: pos.direction,
      entry: pos.entry, exit: q.last, sl: pos.sl, tp: pos.tp,
      pnl: pnl, pnlPct: (pnl / st.balance) * 100,
      rr: slDist > 0 ? rrSign * (actualMove / slDist) : 0,
      riskUsd: pos.riskUsd,
      slippage: pos.slippagePips,
      durationMin: Math.max(1, Math.round((pos.closedAt - pos.openedAt) / 60000)),
      ts: pos.closedAt,
      outcome: pnl > 0 ? 'win' : 'loss',
      notes: ''
    };

    Store.set({
      positions: st.positions.filter(function (p) { return p.id !== pos.id; }),
      journal: st.journal.concat([journalEntry]),
      balance: st.balance + pnl,
      dailyPnL: st.dailyPnL + pnl,
      daysCounted: st.daysCounted + (pnl > 0 && st.daysCounted < st.rules.minDays ? 1 : 0),
      lastTrade: pos
    });
    toast('Position closed · ' + signedFmt(pnl, 2), pnl >= 0 ? 'success' : 'error');
    if (postLiveUnsub) { postLiveUnsub(); postLiveUnsub = null; }
    renderPost();
  }

  /* =================================================================
     JOURNAL
     ================================================================= */
  function renderJournal() {
    var view = $('[data-view="journal"]');
    var st = Store.get();
    var rows = st.journal.slice().reverse();
    if (journalFilter === 'wins') rows = rows.filter(function (r) { return r.outcome === 'win'; });
    if (journalFilter === 'losses') rows = rows.filter(function (r) { return r.outcome === 'loss'; });

    var totalPnl = st.journal.reduce(function (s, r) { return s + r.pnl; }, 0);

    var mainHTML =
      '<div class="page-head">' +
        '<div><div class="page-title">Trade journal</div><div class="page-sub">Review and annotate your trades.</div></div>' +
        '<div class="page-date mono">' + formatDate() + '</div>' +
      '</div>' +

      '<div class="journal-info">' +
        '<div class="journal-info-ic">i</div>' +
        '<span>Every trade is auto-logged. Add your notes, tags and emotional state to improve your edge over time.</span>' +
        '<span class="dismiss">×</span>' +
      '</div>' +

      '<div class="journal-filters">' +
        ['all', 'wins', 'losses'].map(function (f) {
          var count = f === 'all' ? st.journal.length : st.journal.filter(function (r) { return r.outcome === (f === 'wins' ? 'win' : 'loss'); }).length;
          return '<button class="btn btn-sm ' + (journalFilter === f ? 'btn-primary' : 'btn-ghost') + '" data-filter="' + f + '">' + f.charAt(0).toUpperCase() + f.slice(1) + ' · ' + count + '</button>';
        }).join('') +
      '</div>' +

      (rows.length
        ? rows.map(journalCardHTML).join('')
        : '<div class="empty"><div class="empty-illu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 4v16"/></svg></div><div class="empty-title">No trades match this filter.</div></div>');

    var orderHTML =
      '<div class="op-head"><div class="op-title">Journal stats</div><div class="op-step">' + st.journal.length + ' total</div></div>' +
      '<div class="op-section">' +
        '<div class="op-section-label">Performance</div>' +
        '<div class="op-kpi-list">' +
          '<div class="op-kpi"><span class="op-kpi-l">Total P&amp;L</span><span class="op-kpi-v ' + pnlClass(totalPnl) + '">' + signedFmt(totalPnl, 2) + '</span></div>' +
          '<div class="op-kpi"><span class="op-kpi-l">Win rate</span><span class="op-kpi-v">' + winRate(st.journal) + '%</span></div>' +
          '<div class="op-kpi"><span class="op-kpi-l">Wins</span><span class="op-kpi-v success">' + st.journal.filter(function (r) { return r.outcome === 'win'; }).length + '</span></div>' +
          '<div class="op-kpi"><span class="op-kpi-l">Losses</span><span class="op-kpi-v danger">' + st.journal.filter(function (r) { return r.outcome === 'loss'; }).length + '</span></div>' +
          '<div class="op-kpi"><span class="op-kpi-l">Avg R:R</span><span class="op-kpi-v">' + (st.journal.length ? '1 : ' + (st.journal.reduce(function (s, r) { return s + Math.abs(r.rr); }, 0) / st.journal.length).toFixed(2) : '—') + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="op-section">' +
        '<div class="op-section-label">Quick start</div>' +
        '<button class="btn btn-primary btn-full btn-lg" data-go="trade">+ New Trade</button>' +
      '</div>' +
      '<div class="op-footer-hint" style="margin-top:auto">Click any note field below to edit. Changes are saved automatically.</div>';

    view.innerHTML = '<div class="frame">' + sidebarHTML('journal') + topbarHTML() +
      '<main class="main">' + mainHTML + '</main>' +
      '<aside class="orderpanel">' + orderHTML + '</aside>' +
    '</div>';

    bindNav(view);
    $$('[data-filter]', view).forEach(function (b) {
      b.addEventListener('click', function () { journalFilter = b.dataset.filter; renderJournal(); });
    });
    $$('[contenteditable]', view).forEach(function (n) {
      n.addEventListener('blur', function () {
        var id = n.dataset.tradeId;
        var field = n.dataset.field;
        var st2 = Store.get();
        var jr = st2.journal.map(function (r) {
          if (r.id !== id) return r;
          var patch = {};
          patch[field] = n.textContent.trim();
          return Object.assign({}, r, patch);
        });
        Store.set({ journal: jr });
      });
    });
    $$('.dismiss', view).forEach(function (d) { d.addEventListener('click', function () { d.parentElement.style.display = 'none'; }); });
  }

  function journalCardHTML(r) {
    var meta = Sim.getMeta(r.symbol) || { iconClass: 'eur', short: '?', decimals: 5 };
    var slPips = Math.abs(r.entry - r.sl) / (meta.pip || 0.0001);
    var tpPips = Math.abs(r.tp - r.entry) / (meta.pip || 0.0001);
    return '<div class="journal-card">' +
      '<div class="journal-card-head">' +
        '<div class="journal-id-block">' +
          '<div class="pair-icon ' + meta.iconClass + '">' + meta.short + '</div>' +
          '<div><div class="journal-id">' + r.id + ' · ' + r.symbol + ' ' + r.direction.charAt(0).toUpperCase() + r.direction.slice(1) + '</div><div class="journal-date">' + new Date(r.ts).toLocaleString() + '</div></div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:14px">' +
          '<span class="tag ' + (r.outcome === 'win' ? 'win' : 'loss') + '">' + r.outcome.toUpperCase() + '</span>' +
          '<div class="journal-pnl ' + (r.pnl >= 0 ? 'up' : 'down') + '">' + signedFmt(r.pnl, 2) + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="journal-grid">' +
        jrow('Entry', r.entry.toFixed(meta.decimals)) +
        jrow('Exit',  r.exit.toFixed(meta.decimals)) +
        jrow('Direction', r.direction === 'long' ? 'Long ↗' : 'Short ↘') +
        jrow('P&amp;L', signedFmt(r.pnl, 2), r.pnl >= 0 ? 'success' : 'danger') +
        jrow('Size',  fmt(r.riskUsd > 0 ? Math.round(r.riskUsd * 5) : 0, 0) + ' units') +
        jrow('Risk',  '$' + fmt(r.riskUsd, 0) + ' (' + ((r.riskUsd / 52840) * 100).toFixed(1) + '%)') +
        jrow('SL',    r.sl.toFixed(meta.decimals) + ' · ' + slPips.toFixed(0) + ' pips') +
        jrow('TP',    r.tp.toFixed(meta.decimals) + ' · ' + tpPips.toFixed(0) + ' pips') +
        jrow('Actual R:R', (r.rr > 0 ? '1 : ' + r.rr.toFixed(2) : r.rr.toFixed(2))) +
        jrow('Duration', r.durationMin >= 60 ? Math.floor(r.durationMin / 60) + 'h ' + (r.durationMin % 60) + 'm' : r.durationMin + 'm') +
        jrow('Slippage', r.slippage > 0 ? '+' + r.slippage.toFixed(2) + ' pips' : '0 pips') +
        jrow('Rules', '8 / 8 ✓') +
      '</div>' +

      '<div class="journal-divider"></div>' +

      '<div class="journal-editable">' +
        editableRow('Emotion', r.id, 'emotion', r.emotion || '', 'How did you feel during this trade?') +
        editableRow('Setup',   r.id, 'setup',   r.setup   || '', 'What was the trade idea?') +
        editableRow('Tags',    r.id, 'tags',    r.tags    || '', 'Comma-separated tags...') +
        editableRow('Notes',   r.id, 'notes',   r.notes   || '', 'Reflections, lessons learned...', true) +
      '</div>' +
    '</div>';
  }

  function jrow(l, v, cls) {
    return '<div class="journal-row"><span class="l">' + l + '</span><span class="v ' + (cls || '') + '">' + v + '</span></div>';
  }

  function editableRow(label, id, field, value, ph, isTextarea) {
    var cls = isTextarea ? 'textarea-pill' : 'input-pill';
    return '<div class="journal-editable-row"><span class="l">' + label + '</span>' +
      '<span class="' + cls + '" contenteditable="true" data-trade-id="' + id + '" data-field="' + field + '" data-placeholder="' + escapeAttr(ph) + '">' + escapeHtml(value) + '</span>' +
    '</div>';
  }

  function winRate(j) {
    if (!j.length) return 0;
    return Math.round(j.filter(function (r) { return r.outcome === 'win'; }).length / j.length * 100);
  }

  /* =================================================================
     DEMO TOGGLES
     ================================================================= */
  function demoTogglesHTML() {
    return '<div class="demo-toggle">' +
      ['normal', 'amber', 'locked'].map(function (m) {
        return '<div class="demo-toggle-pill ' + (demoMode === m ? 'active' : '') + '" data-demo="' + m + '">' + m + '</div>';
      }).join('') +
    '</div>';
  }

  function bindDemoToggle(root) {
    $$('[data-demo]', root).forEach(function (p) {
      p.addEventListener('click', function () { setDemoMode(p.dataset.demo); });
    });
  }

  function setDemoMode(mode) {
    demoMode = mode;
    var st = Store.get();
    if (mode === 'normal') Store.set({ dailyPnL: 0 });
    if (mode === 'amber') Store.set({ dailyPnL: -st.balance * 0.0425 });
    if (mode === 'locked') Store.set({ dailyPnL: -st.balance * 0.052 });
    render(currentView);
  }

  /* =================================================================
     Sparklines
     ================================================================= */
  function drawAllSparklines(root) {
    $$('[data-pair-spark]', root).forEach(function (svg) {
      var sym = svg.dataset.pairSpark;
      drawSpark(svg, Sim.getRecentCloses(sym, 30));
    });
    $$('[data-mini-spark]', root).forEach(function (svg) {
      drawSpark(svg, randomWalk(30, Math.random() > 0.5 ? 1 : -1));
    });
  }

  /* CSS flash without forcing layout */
  function flashTick(el, up) {
    var cls = up ? 'tick-up' : 'tick-down';
    el.classList.remove('tick-up', 'tick-down');
    el.classList.add(cls);
    if (el._flashTimer) clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(function () { el.classList.remove(cls); }, 600);
  }

  function drawSpark(svg, points) {
    if (!points || !points.length) return;
    var min = Math.min.apply(null, points), max = Math.max.apply(null, points);
    var range = max - min || 1;
    var w = 100, h = parseFloat(svg.getAttribute('viewBox').split(' ')[3]);
    var coords = points.map(function (v, i) {
      var x = (i / (points.length - 1)) * w;
      var y = h - ((v - min) / range) * (h - 2) - 1;
      return [x, y];
    });
    var d = coords.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join('');
    var dArea = d + ' L' + w + ',' + h + ' L0,' + h + ' Z';
    svg.innerHTML = '<path class="spark-area" d="' + dArea + '"/><path class="spark-line" d="' + d + '"/>';
  }

  function randomWalk(n, trend) {
    var v = 100, out = [];
    for (var i = 0; i < n; i++) { v += (Math.random() - 0.5 + trend * 0.15) * 4; out.push(v); }
    return out;
  }

  /* =================================================================
     Helpers
     ================================================================= */
  function bindNav(root) {
    $$('[data-go]', root).forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); go(b.dataset.go); });
    });
    $$('[data-pair-card]', root).forEach(function (c) {
      if (c.closest('#orderpanel')) return;
      c.addEventListener('click', function () {
        trade.symbol = c.dataset.symbol; trade.direction = null; trade.step = 1;
        go('trade');
      });
    });
    $$('[data-close-pos]', root).forEach(function (b) {
      b.addEventListener('click', openCloseConfirmModal);
    });
  }

  function computeUnrealized(pos, q) {
    if (!pos || !q) return 0;
    var meta = Sim.getMeta(pos.symbol);
    var diff = pos.direction === 'long' ? (q.last - pos.entry) : (pos.entry - q.last);
    var pips = diff / meta.pip;
    var pipValuePerUnit = meta.pipValue / 100000;
    if (meta.symbol === 'BTC/USDT') pipValuePerUnit = 1;
    return pips * pipValuePerUnit * pos.units;
  }

  function fmt(n, d) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function signedFmt(n, d) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return (n >= 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function pnlClass(n) { return n > 0 ? 'success' : (n < 0 ? 'danger' : ''); }
  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); var args = arguments, ctx = this; t = setTimeout(function () { fn.apply(ctx, args); }, ms); };
  }
  function sameDay(a, b) {
    var da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  }
  function formatDate() {
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var d = new Date();
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' · ' + hh + ':' + mm + ' UTC';
  }

  function toast(msg, kind) {
    var stack = $('#toast-stack');
    var ic = ({ success: '✓', error: '✕', info: 'i' })[kind] || '·';
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || 'info');
    el.innerHTML = '<span class="toast-ic">' + ic + '</span><span>' + msg + '</span>';
    stack.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '0'; el.style.transform = 'translateX(20px)';
      setTimeout(function () { el.remove(); }, 300);
    }, 3500);
  }

  /* =================================================================
     Reset & boot
     ================================================================= */
  function resetDemo() {
    if (!confirm('Reset all demo state? Journal, balance and rules will revert to seed values.')) return;
    Store.reset();
    trade = { step: 1, symbol: 'EUR/USD', direction: null, riskMode: 'percent', riskPct: 1.0, riskUsd: 0, entry: null, sl: null, tp: null, search: '' };
    demoMode = 'normal'; journalFilter = 'all';
    toast('Demo reset complete', 'info');
    go('entry');
  }

  document.addEventListener('DOMContentLoaded', function () {
    Sim.start();
    var st = Store.get();
    var hash = window.location.hash.slice(1);
    var validViews = ['entry', 'rules', 'dashboard', 'trade', 'post', 'journal'];
    var initialView = validViews.indexOf(hash) !== -1 ? hash : (st.rulesConfirmed ? 'dashboard' : 'entry');
    go(initialView);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') Sim.stop();
      else Sim.start();
    });

    /* Keep topbar in sync as state changes */
    Store.subscribe(function () {
      var st2 = Store.get();
      var bal = $('#tb-balance'); if (bal) bal.textContent = '$' + fmt(st2.balance, 2);
      var pnl = $('#tb-pnl');
      if (pnl) {
        pnl.textContent = signedFmt(st2.dailyPnL, 2);
        pnl.className = 'metric-value mono ' + pnlClass(st2.dailyPnL);
      }
    });
  });

  root.App = {
    go: go,
    resetDemo: resetDemo,
    toast: toast
  };
})(window);
