import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatShortDate } from '../../lib/format';
import { isRulesStaleByAge } from '../../lib/store';
import { useGKState } from '../../hooks/useGKState';

const SESSION_NOTICE_KEY = 'gk-session-notice-dismissed';

export function SessionBanners(): React.ReactElement | null {
  const st = useGKState();
  const [noticeDismissed, setNoticeDismissed] = useState(
    () => sessionStorage.getItem(SESSION_NOTICE_KEY) === '1',
  );

  if (!st.rulesConfirmed) return null;

  const stale = isRulesStaleByAge(st);

  if (stale) {
    return (
      <div className="banner banner-stale session-banner" role="alert">
        <div className="banner-icon">!</div>
        <div className="banner-body">
          <div className="stale-title">Your rule set is 30+ days old</div>
          <div className="banner-text">
            Verify your firm&apos;s current rules before proceeding. Trading is blocked until you re-confirm.
            {st.confirmedAt ? ` Last verified: ${formatShortDate(st.confirmedAt)}.` : ''}
          </div>
        </div>
        <Link className="btn btn-primary btn-sm" to="/rules">
          Re-confirm current rules
        </Link>
      </div>
    );
  }

  if (!noticeDismissed) {
    return (
      <div className="banner warn session-banner" role="status">
        <div className="banner-icon">i</div>
        <div className="banner-body">
          <div className="banner-title">Rules reminder</div>
          <div className="banner-text">
            Prop firm rules change regularly — verify your current rules before each new challenge phase or trading
            week.
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            sessionStorage.setItem(SESSION_NOTICE_KEY, '1');
            setNoticeDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  return null;
}
