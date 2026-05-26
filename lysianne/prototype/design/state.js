/* Gatekeeper · Mini state store with pub/sub + localStorage */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'gk-design-state-v1';
  var listeners = {};
  var globalListeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed || null;
    } catch (e) { return null; }
  }

  function save(state) {
    try {
      var copy = Object.assign({}, state);
      delete copy.candles;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
    } catch (e) {}
  }

  var state = load() || JSON.parse(JSON.stringify(GK_DATA.INITIAL_STATE));
  if (!state.rules || !state.rules.minDailyGain) {
    state = JSON.parse(JSON.stringify(GK_DATA.INITIAL_STATE));
  }

  function get() { return state; }

  function set(patch) {
    var prev = state;
    state = Object.assign({}, state, patch);
    save(state);
    fire(prev, state, Object.keys(patch));
  }

  function update(fn) {
    var next = fn(state);
    if (next && next !== state) {
      var prev = state;
      state = Object.assign({}, state, next);
      save(state);
      fire(prev, state, Object.keys(next));
    } else {
      save(state);
      fire(state, state, []);
    }
  }

  function subscribe(key, cb) {
    if (typeof key === 'function') {
      globalListeners.push(key);
      return function () {
        globalListeners = globalListeners.filter(function (x) { return x !== key; });
      };
    }
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(cb);
    return function () {
      listeners[key] = listeners[key].filter(function (x) { return x !== cb; });
    };
  }

  function fire(prev, next, keys) {
    keys.forEach(function (k) {
      (listeners[k] || []).forEach(function (cb) {
        try { cb(next[k], prev[k]); } catch (e) { console.error(e); }
      });
    });
    globalListeners.forEach(function (cb) {
      try { cb(next, prev); } catch (e) { console.error(e); }
    });
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    state = JSON.parse(JSON.stringify(GK_DATA.INITIAL_STATE));
    save(state);
    fire({}, state, Object.keys(state));
  }

  root.Store = {
    get: get,
    set: set,
    update: update,
    subscribe: subscribe,
    reset: reset
  };
})(window);
