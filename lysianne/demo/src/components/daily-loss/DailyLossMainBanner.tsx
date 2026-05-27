import { Link } from 'react-router-dom';
import { dailyLossLockedBannerText, dailyLossWarnMessage } from '../../lib/dailyLossAlert';
import { isDailyLossBlocked, isDailyLossWarning } from '../../lib/riskMetrics';
import { useDailyLossCountdown } from '../../hooks/useDailyLossCountdown';
import { useGKState } from '../../hooks/useGKState';

export function DailyLossMainBanner(): React.ReactElement | null {
  const st = useGKState();
  const blocked = isDailyLossBlocked(st);
  const warning = isDailyLossWarning(st);
  const countdown = useDailyLossCountdown(blocked);

  if (blocked) {
    return (
      <div className="banner block" role="alert">
        <div className="banner-icon" aria-hidden="true">
          ⊘
        </div>
        <div className="banner-body">
          <div className="banner-title">Trading locked</div>
          <div className="banner-text">
            {dailyLossLockedBannerText()} ({countdown}).
          </div>
        </div>
      </div>
    );
  }

  if (warning) {
    return (
      <div className="banner warn" role="alert">
        <div className="banner-icon" aria-hidden="true">
          !
        </div>
        <div className="banner-body">
          <div className="banner-title">Warning</div>
          <div className="banner-text">{dailyLossWarnMessage(st)}</div>
        </div>
        <div className="banner-actions">
          <Link className="btn btn-ghost btn-sm" to="/rules">
            Read rule
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
