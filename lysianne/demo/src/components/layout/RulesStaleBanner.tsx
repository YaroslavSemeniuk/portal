import { Link } from 'react-router-dom';
import { formatShortDate } from '../../lib/format';
import type { RulesStaleReason } from '../../lib/store';

const COPY: Record<
  RulesStaleReason,
  { title: string; body: string }
> = {
  age: {
    title: 'Your rule set is 30+ days old',
    body:
      "Verify your firm's current rules before proceeding. Rule changes may invalidate in-progress challenges. Dashboard, Trade and Journal tabs are locked until you re-confirm.",
  },
  epoch: {
    title: 'Your firm updated the ruleset',
    body:
      'Review the updated rules before proceeding. Dashboard, Trade and Journal tabs are locked until you re-confirm.',
  },
};

export function RulesStaleBanner({
  reason,
  confirmedAt,
  className = '',
  showCta = true,
}: {
  reason: RulesStaleReason;
  confirmedAt?: number | null;
  className?: string;
  showCta?: boolean;
}): React.ReactElement {
  const { title, body } = COPY[reason];
  return (
    <div className={`banner banner-stale ${className}`.trim()} role="alert">
      <div className="banner-icon">!</div>
      <div className="banner-body">
        <div className="stale-title">{title}</div>
        <div className="banner-text">
          {body}
          {confirmedAt != null ? ` Last verified: ${formatShortDate(confirmedAt)}.` : ''}
        </div>
      </div>
      {showCta ? (
        <Link className="btn btn-primary btn-sm" to="/rules">
          Re-confirm current rules
        </Link>
      ) : null}
    </div>
  );
}
