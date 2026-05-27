import { computeUnrealized, signedFmt } from '../../lib/format';
import { Sim } from '../../lib/sim';
import { useGKState } from '../../hooks/useGKState';
import type { Position } from '../../lib/types';

export function CloseConfirmModal({
  pos,
  onCancel,
  onConfirm,
}: {
  pos: Position;
  onCancel: () => void;
  onConfirm: () => void;
}): React.ReactElement {
  const st = useGKState();
  const meta = Sim.getMeta(pos.symbol);
  const q = Sim.getQuote(pos.symbol);
  if (!meta || !q) return <></>;
  const pnl = computeUnrealized(pos, q);
  const pct = (pnl / st.balance) * 100;
  const projectedDayPct = ((st.dailyPnL + pnl) / st.balance) * 100;
  const dayQualWarn = projectedDayPct < st.rules.minDailyGain;

  return (
    <div className="modal-overlay" id="close-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={`modal-card ${dayQualWarn ? 'modal-warn-border' : ''}`}>
        <div className={`modal-icon ${pnl >= 0 ? 'success' : 'warn'}`}>{pnl >= 0 ? '✓' : '!'}</div>
        <div className="modal-title">Close position at market?</div>
        <div className="modal-body">
          You are about to close <strong>{pos.symbol}</strong> <strong>{pos.direction}</strong> at market. Current P&amp;L
          is{' '}
          <strong className={pnl >= 0 ? 'text-success' : 'text-danger'}>{signedFmt(pnl, 2)}</strong> (
          {(pct >= 0 ? '+' : '') + pct.toFixed(2)}% of balance).
          <br />
          <br />
          This day will count toward your trading days requirement.
          {dayQualWarn ? (
            <>
              <br />
              <br />
              <strong className="text-warn">Day qualification:</strong> Closing here (
              {(projectedDayPct >= 0 ? '+' : '') + projectedDayPct.toFixed(1)}%) will not count as a valid trading day —
              minimum +{st.rules.minDailyGain}% required.
            </>
          ) : null}
        </div>
        <div className="modal-stats">
          <div className="modal-stat">
            <div className="ms-l">Entry</div>
            <div className="ms-v">{pos.entry.toFixed(meta.decimals)}</div>
          </div>
          <div className="modal-stat">
            <div className="ms-l">Mark</div>
            <div className="ms-v">{q.last.toFixed(meta.decimals)}</div>
          </div>
          <div className="modal-stat">
            <div className="ms-l">P&amp;L</div>
            <div className={`ms-v ${pnl >= 0 ? 'success' : 'danger'}`}>{signedFmt(pnl, 2)}</div>
          </div>
        </div>
        <div className="modal-cta">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            {dayQualWarn ? 'Keep Open' : 'Cancel'}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {dayQualWarn ? 'Close Anyway' : 'Close at market'}
          </button>
        </div>
      </div>
    </div>
  );
}
