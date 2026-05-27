import { DailyLossMainBanner } from '../daily-loss/DailyLossMainBanner';
import { SessionBanners } from './SessionBanners';
import { isDailyLossBlocked, isDailyLossWarning } from '../../lib/riskMetrics';
import { useGKState } from '../../hooks/useGKState';

/** Session and daily-loss banners — first block inside `<main>`. */
export function MainTopAlerts({ showDailyLoss = true }: { showDailyLoss?: boolean }): React.ReactElement | null {
  const st = useGKState();
  if (!st.rulesConfirmed) return null;

  const showDaily = showDailyLoss && (isDailyLossBlocked(st) || isDailyLossWarning(st));

  return (
    <div className="main-top-alerts">
      {showDaily ? <DailyLossMainBanner /> : null}
      <SessionBanners />
    </div>
  );
}
