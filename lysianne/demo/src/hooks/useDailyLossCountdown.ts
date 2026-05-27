import { useEffect, useState } from 'react';
import { formatDailyLossResetCountdown } from '../lib/riskMetrics';

/** Live HH:MM:SS until daily loss resets at 00:00 UTC. */
export function useDailyLossCountdown(active = true): string {
  const [countdown, setCountdown] = useState(() => formatDailyLossResetCountdown());

  useEffect(() => {
    if (!active) return;
    const tick = () => setCountdown(formatDailyLossResetCountdown());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  return countdown;
}
