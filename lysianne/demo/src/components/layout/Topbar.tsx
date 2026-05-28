import { useState } from 'react';
import { fmt, pnlClass, signedFmt } from '../../lib/format';
import {
  dailyLossBarClass,
  dailyLossBarTier,
  dailyLossUsagePct,
  dailyLossValueClass,
  trailingDrawdownSnapshot,
} from '../../lib/riskMetrics';
import { useGKState } from '../../hooks/useGKState';
import { DrawdownInfoPopover } from './DrawdownInfoPopover';

export function Topbar(): React.ReactElement {
  const st = useGKState();
  const [ddOpen, setDdOpen] = useState(false);
  const dailyUsage = dailyLossUsagePct(st);
  const lossTier = dailyLossBarTier(dailyUsage);
  const lossFillClass = dailyLossBarClass(lossTier);
  const lossPctClass = dailyLossValueClass(lossTier);
  const { peak, ddPct, ddFloor, drawdownLim } = trailingDrawdownSnapshot(st);
  const ddUsageOfLimit = drawdownLim > 0 ? Math.min(100, (ddPct / drawdownLim) * 100) : 0;
  const ddBarWarn = ddPct >= 0.85 * drawdownLim;

  return (
    <header className="topbar">
      <div className="demo-badge">Demo Mode</div>
      <div className="spacer" />
      <div className="metric">
        <span className="metric-label">Balance</span>
        <span className="metric-value mono" id="tb-balance">
          ${fmt(st.balance, 2)}
        </span>
      </div>
      <div className="metric">
        <span className="metric-label">P&amp;L today</span>
        <span className={`metric-value mono ${pnlClass(st.dailyPnL)}`} id="tb-pnl">
          {signedFmt(st.dailyPnL, 2)}
        </span>
      </div>
      <div className="bar-group">
        <div className="bar-head">
          <span className="label">Daily loss</span>
          <span className={`pct ${lossPctClass}`} id="tb-loss-pct">
            {dailyUsage.toFixed(0)}%
          </span>
        </div>
        <div className="bar-track">
          <div className={`bar-fill ${lossFillClass}`} id="tb-loss-fill" style={{ width: `${dailyUsage}%` }} />
        </div>
      </div>
      <div className={`bar-group bar-group-dd ${ddOpen ? 'is-open' : ''}`}>
        <div className="bar-head bar-head-dd">
          <span className="label">Drawdown</span>
          <span className="pct">{ddPct.toFixed(1)}%</span>
          <DrawdownInfoPopover
            peak={peak}
            ddPct={ddPct}
            ddFloor={ddFloor}
            drawdownLim={drawdownLim}
            ddUsageOfLimit={ddUsageOfLimit}
            onOpenChange={setDdOpen}
          />
        </div>
        <div className="bar-track">
          <div
            className={`bar-fill ${ddBarWarn ? 'warn' : ''}`}
            style={{ width: `${ddUsageOfLimit}%` }}
          />
        </div>
      </div>
    </header>
  );
}
