import { useLocation, useNavigate } from 'react-router-dom';
import { useTradeDraft } from '../../app/tradeDraft';
import { useToast } from '../../app/toast';
import { resetStore } from '../../lib/store';
import { Sim } from '../../lib/sim';

export function ResetDemoButton(): React.ReactElement | null {
  const loc = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { resetDraft } = useTradeDraft();

  if (loc.pathname === '/entry') return null;

  const onReset = () => {
    Sim.stop();
    resetStore();
    resetDraft();
    sessionStorage.removeItem('gk-session-notice-dismissed');
    toast('Demo reset — starting fresh.', 'info');
    navigate('/entry', { replace: true });
  };

  return (
    <button type="button" className="reset-demo" onClick={onReset} title="Reset all demo state">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      Reset demo
    </button>
  );
}
