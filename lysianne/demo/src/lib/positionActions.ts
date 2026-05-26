import { computeUnrealized } from './format';
import { Sim } from './sim';
import { getState, setState } from './store';
import type { JournalEntry, Position } from './types';

export function closePositionAtMarket(pos: Position): number {
  const st = getState();
  const q = Sim.getQuote(pos.symbol);
  if (!q) return 0;
  const pnl = computeUnrealized(pos, q);
  const meta = Sim.getMeta(pos.symbol);
  if (!meta) return pnl;

  const slDist = Math.abs(pos.entry - pos.sl);
  const actualMove = Math.abs(q.last - pos.entry);
  const rrSign = pnl > 0 ? 1 : -1;

  const settled: JournalEntry = {
    id: pos.journalEntryId ?? pos.id.replace('POS', 'TR'),
    symbol: pos.symbol,
    direction: pos.direction,
    entry: pos.entry,
    exit: q.last,
    sl: pos.sl,
    tp: pos.tp,
    pnl,
    pnlPct: (pnl / st.balance) * 100,
    rr: slDist > 0 ? rrSign * (actualMove / slDist) : 0,
    riskUsd: pos.riskUsd,
    slippage: pos.slippagePips,
    durationMin: Math.max(1, Math.round((Date.now() - pos.openedAt) / 60000)),
    ts: Date.now(),
    outcome: pnl > 0 ? 'win' : 'loss',
    notes: '',
  };

  const journal = pos.journalEntryId
    ? st.journal.map((j) => (j.id === pos.journalEntryId ? settled : j))
    : [...st.journal, settled];

  const closed: Position = {
    ...pos,
    closedAt: Date.now(),
    exit: q.last,
    realizedPnL: pnl,
  };

  setState({
    positions: st.positions.filter((p) => p.id !== pos.id),
    journal,
    balance: st.balance + pnl,
    dailyPnL: st.dailyPnL + pnl,
    daysCounted: st.daysCounted + (pnl > 0 && st.daysCounted < st.rules.minDays ? 1 : 0),
    lastTrade: closed,
  });
  return pnl;
}
