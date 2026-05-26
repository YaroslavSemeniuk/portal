import { Link, useNavigate } from 'react-router-dom';
import { SEED_RULES } from '../../lib/data';
import { formatShortDate } from '../../lib/format';
import { Sim } from '../../lib/sim';
import { isRulesStaleByAge, rulesNeedReconfirm, setState } from '../../lib/store';
import { useToast } from '../../app/toast';
import { useGKState } from '../../hooks/useGKState';

export function RulesView(): React.ReactElement {
  const st = useGKState();
  const navigate = useNavigate();
  const toast = useToast();
  const epochStale = rulesNeedReconfirm(st);
  const ageStale = isRulesStaleByAge(st);
  const stale = epochStale || ageStale;
  const locked = st.rulesConfirmed && !stale;
  const lastVerified =
    st.confirmedAt != null ? formatShortDate(st.confirmedAt) : formatShortDate();

  const confirm = () => {
    if (locked && !stale) return;
    setState({
      rulesConfirmed: true,
      confirmedAt: Date.now(),
      confirmedRulesEpoch: st.rulesEpoch,
    });
    Sim.start();
    toast(stale ? 'Rules re-confirmed. Trading enabled.' : 'Rules confirmed. Trading enabled.', 'success');
    navigate('/dashboard', { replace: true });
  };

  const simulateFirmUpdate = () => {
    setState({ rulesEpoch: st.rulesEpoch + 1 });
    toast('Demo: firm published a ruleset update — re-confirm to continue trading.', 'info');
  };

  const simulateAgeStale = () => {
    setState({ confirmedAt: Date.now() - 31 * 86400000 });
    toast('Demo: rules marked as 31+ days old.', 'info');
  };

  return (
    <section className="view rules-view">
      <div className="rules-frame">
        <div className="rules-inner">
          <div className="page-head" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <div>
              <div className="page-title">Confirm your prop-firm rules</div>
              <div className="page-sub">
                {locked && !stale
                  ? `Rules are locked for this evaluation session. ${st.confirmedAt ? `Rules loaded on ${formatShortDate(st.confirmedAt)}.` : ''} Use the demo controls below only to simulate updates.`
                  : ageStale
                    ? 'Your rule set is 30+ days old. Verify your firm’s current rules and re-confirm to resume trading.'
                    : epochStale
                      ? 'Your firm updated the ruleset. Review and confirm to resume trading.'
                      : 'Step 2 of 4 · Setup — before trading, lock in the ruleset the platform will enforce.'}
              </div>
            </div>
          </div>

          {ageStale ? (
            <div className="banner banner-stale" role="alert" style={{ marginBottom: 16 }}>
              <div className="banner-icon">!</div>
              <div className="banner-body">
                <div className="stale-title">Your rule set is 30+ days old</div>
                <div className="banner-text">
                  Verify your firm&apos;s current rules before proceeding. Trading is blocked until you re-confirm.
                </div>
              </div>
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: 20, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 }}>
              <div className="confirm-card" style={{ position: 'relative', zIndex: 1 }}>
                <div className="preset-meta">
                  <div>
                    <div className="preset-meta-l">Option A · Preset</div>
                    <div className="preset-meta-r">Demo Firm — Standard Evaluation · 8 rules</div>
                    <div className="preset-meta-verified">Last verified: {lastVerified}</div>
                  </div>
                  <span className="tag primary">Recommended</span>
                </div>
                <div className="confirm-list">
                  {SEED_RULES.map((r) => (
                    <div key={r.id} className="confirm-row">
                      <div className="confirm-row-ic">✓</div>
                      <div className="confirm-row-body">
                        <div className="confirm-row-l">{r.title}</div>
                        <div className="confirm-row-sub">{r.sub}</div>
                      </div>
                      <div className="confirm-row-v">{r.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="confirm-card"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  opacity: 0.55,
                  pointerEvents: 'none',
                  alignSelf: 'stretch',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
                aria-disabled="true"
              >
                <div className="preset-meta">
                  <div>
                    <div className="preset-meta-l">Option B · Paste rules</div>
                    <div className="preset-meta-r">Coming in full version</div>
                  </div>
                  <span className="tag">Prototype</span>
                </div>
                <p className="cs-body" style={{ margin: '16px 0 0', fontSize: 14 }}>
                  Import a custom rules YAML/JSON in the production build. This demo only ships the locked preset above.
                </p>
              </div>
            </div>

            <div className="cta-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <Link className="btn btn-ghost" to="/entry">
                ← Back
              </Link>
              <div className="cta-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {st.rulesConfirmed ? (
                  <>
                    <button type="button" className="btn btn-outline" onClick={simulateFirmUpdate}>
                      Simulate firm rules update (demo)
                    </button>
                    <button type="button" className="btn btn-outline" onClick={simulateAgeStale}>
                      Simulate 31-day-old rules (demo)
                    </button>
                  </>
                ) : null}
                {!locked || stale ? (
                  <button type="button" className="btn btn-primary btn-lg" onClick={confirm}>
                    {stale ? 'Re-confirm current rules' : 'Confirm & Continue'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  <span className="tag success">Rules locked for this session</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
