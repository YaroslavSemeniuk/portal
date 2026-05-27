import { useState } from 'react';
import { getRulesStaleReason } from '../../lib/store';
import { useGKState } from '../../hooks/useGKState';
import { RulesStaleBanner } from './RulesStaleBanner';

const SESSION_NOTICE_KEY = 'gk-session-notice-dismissed';

export function SessionBanners(): React.ReactElement | null {
  const st = useGKState();
  const [noticeDismissed, setNoticeDismissed] = useState(
    () => sessionStorage.getItem(SESSION_NOTICE_KEY) === '1',
  );

  if (!st.rulesConfirmed) return null;

  const staleReason = getRulesStaleReason(st);

  if (staleReason) {
    return (
      <RulesStaleBanner
        reason={staleReason}
        confirmedAt={st.confirmedAt}
        className="session-banner"
      />
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
