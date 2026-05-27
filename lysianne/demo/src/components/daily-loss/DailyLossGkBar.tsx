import { dailyLossBlockMessage, dailyLossWarnMessage } from '../../lib/dailyLossAlert';
import { isDailyLossBlocked, isDailyLossWarning } from '../../lib/riskMetrics';
import { useDailyLossCountdown } from '../../hooks/useDailyLossCountdown';
import { useGKState } from '../../hooks/useGKState';

export function DailyLossGkBar(): React.ReactElement | null {
  const st = useGKState();
  const blocked = isDailyLossBlocked(st);
  const warning = isDailyLossWarning(st);
  const countdown = useDailyLossCountdown(blocked);

  if (!blocked && !warning) return null;

  if (blocked) {
    return (
      <div className="gk-bar block" role="alert">
        <div className="gk-icon" aria-hidden="true">
          ⊘
        </div>
        <div className="gk-content">
          <div className="gk-title">1 Rule preventing execution</div>
          <div className="gk-text">{dailyLossBlockMessage(st)}</div>
          <div className="gk-countdown mono" aria-live="polite">
            {countdown}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gk-bar warn" role="alert">
      <div className="gk-icon" aria-hidden="true">
        !
      </div>
      <div className="gk-content">
        <div className="gk-title">Warning</div>
        <div className="gk-text">{dailyLossWarnMessage(st)}</div>
      </div>
    </div>
  );
}
