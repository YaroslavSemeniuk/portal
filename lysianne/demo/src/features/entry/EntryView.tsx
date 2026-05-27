import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const MOBILE_MQ = '(max-width: 1023px)';

export function EntryView(): React.ReactElement {
  const [isNarrow, setIsNarrow] = useState(false);
  const [shimmer, setShimmer] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setShimmer(false), 900);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section className={`view ${shimmer ? 'entry-shimmer' : ''}`}>
      <div className="frame fullbleed">
        <div className="center-stage">
          <div className="cs-logo">P</div>
          <div className="cs-product-name">[Platform]</div>
          <div className="cs-tagline">Trade with Discipline</div>
          <div className="cs-tag">
            <span className="dot" /> Live demo · No real funds
          </div>
          <h1 className="cs-heading">
            Trade the right way.
            <br />
            <span className="accent">No real money required.</span>
          </h1>
          <p className="cs-body">
            Every prop-firm rule, enforced before you click execute. Discipline is built into the platform — not bolted
            on with reminders.
          </p>
          {isNarrow ? (
            <div className="cs-body" style={{ maxWidth: 520, margin: '0 auto', color: 'var(--c-07)' }}>
              This desktop evaluation demo is designed for a wide layout (1024px and up). Open on a larger display or
              resize your window to continue.
            </div>
          ) : null}
          <div className="cs-cta-row">
            <Link className={`btn btn-primary btn-lg ${isNarrow ? 'btn-disabled' : ''}`} to={isNarrow ? '#' : '/rules'} aria-disabled={isNarrow} onClick={(e) => isNarrow && e.preventDefault()}>
              Enter Demo
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
          <div className="cs-stats">
            <div className="cs-stat">
              <div className="cs-stat-val">8</div>
              <div className="cs-stat-l">Rules enforced</div>
            </div>
            <div className="cs-stat">
              <div className="cs-stat-val">0ms</div>
              <div className="cs-stat-l">Override allowed</div>
            </div>
            <div className="cs-stat">
              <div className="cs-stat-val">100%</div>
              <div className="cs-stat-l">Audit trail</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
