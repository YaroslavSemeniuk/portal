import { fmt, pnlClass, signedFmt } from '../../lib/format';
import {
  dailyLossBarClass,
  dailyLossBarTier,
  dailyLossUsagePct,
  dailyLossValueClass,
} from '../../lib/riskMetrics';
import { useGKState } from '../../hooks/useGKState';

export function Topbar(): React.ReactElement {
  const st = useGKState();
  const dailyUsage = dailyLossUsagePct(st);
  const lossTier = dailyLossBarTier(dailyUsage);
  const lossFillClass = dailyLossBarClass(lossTier);
  const lossPctClass = dailyLossValueClass(lossTier);
  const peak = Math.max(st.equityHighWaterMark ?? st.startingBalance, st.balance);
  const ddPct = peak > 0 ? Math.max(0, ((peak - st.balance) / peak) * 100) : 0;

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
      <div className="bar-group">
        <div className="bar-head">
          <span className="label">Drawdown</span>
          <span className="pct">{ddPct.toFixed(1)}%</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${Math.min(100, (ddPct / st.rules.drawdownLim) * 100)}%` }} />
        </div>
      </div>
    </header>
  );
}
