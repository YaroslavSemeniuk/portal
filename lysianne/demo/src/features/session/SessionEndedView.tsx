import { Link } from 'react-router-dom';
import { resetStore } from '../../lib/store';

export function SessionEndedView(): React.ReactElement {
  return (
    <section className="view">
      <div className="frame fullbleed">
        <div className="center-stage" style={{ textAlign: 'center', maxWidth: 480 }}>
          <div className="cs-tag">
            <span className="dot" /> Session ended
          </div>
          <h1 className="cs-heading" style={{ fontSize: 28 }}>
            Maximum drawdown reached
          </h1>
          <p className="cs-body">
            Under the demo evaluation rules, trading stops when the account hits the drawdown floor from peak equity. Reset
            the demo to start a fresh session.
          </p>
          <div className="cs-cta-row" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => {
                resetStore();
                window.location.href = '/entry';
              }}
            >
              Reset demo
            </button>
            <Link className="btn btn-ghost btn-lg" to="/entry">
              Back to entry
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
