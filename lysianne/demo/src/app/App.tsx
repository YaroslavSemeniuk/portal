import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Sim } from '../lib/sim';
import { getState, isTradingBlocked, setState } from '../lib/store';
import { ResetDemoButton } from '../components/layout/ResetDemoButton';
import { useGKState } from '../hooks/useGKState';
import { ToastProvider } from './toast';
import { TradeDraftProvider } from './tradeDraft';
import { MobileGate } from '../components/layout/MobileGate';
import { EntryView } from '../features/entry/EntryView';
import { RulesView } from '../features/rules/RulesView';
import { DashboardView } from '../features/dashboard/DashboardView';
import { TradeView } from '../features/trade/TradeView';
import { PostView } from '../features/post/PostView';
import { JournalView } from '../features/journal/JournalView';
import { SessionEndedView } from '../features/session/SessionEndedView';

function RequireRules({ children }: { children: React.ReactNode }): React.ReactElement {
  const st = useGKState();
  if (st.sessionTerminated) return <Navigate to="/session-ended" replace />;
  if (!st.rulesConfirmed) return <Navigate to="/rules" replace />;
  if (isTradingBlocked(st)) return <Navigate to="/rules" replace />;
  return <>{children}</>;
}

function SimLifecycle(): null {
  useEffect(() => {
    Sim.start();
    const onVis = () => {
      if (document.visibilityState === 'hidden') Sim.stop();
      else Sim.start();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      Sim.stop();
    };
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = getState();
      const now = Date.now();
      const w = s.rules.newsWindow * 60 * 1000;
      if (s.nextImpactNewsAt == null || now > s.nextImpactNewsAt + w + 5 * 60 * 1000) {
        setState({ nextImpactNewsAt: now + (5 + Math.random() * 15) * 60 * 1000 });
      }
    }, 25000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}

function RouterBody(): React.ReactElement {
  const st = useGKState();

  return (
    <>
      <SimLifecycle />
      <ResetDemoButton />
      <Routes>
        <Route path="/" element={<Navigate to={st.sessionTerminated ? '/session-ended' : st.rulesConfirmed ? '/dashboard' : '/entry'} replace />} />
        <Route path="/entry" element={<EntryView />} />
        <Route path="/rules" element={<RulesView />} />
        <Route path="/session-ended" element={<SessionEndedView />} />
        <Route
          path="/dashboard"
          element={
            <RequireRules>
              <DashboardView />
            </RequireRules>
          }
        />
        <Route
          path="/trade"
          element={
            <RequireRules>
              <TradeView />
            </RequireRules>
          }
        />
        <Route
          path="/post"
          element={
            <RequireRules>
              <PostView />
            </RequireRules>
          }
        />
        <Route
          path="/journal"
          element={
            <RequireRules>
              <JournalView />
            </RequireRules>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export function App(): React.ReactElement {
  return (
    <MobileGate>
      <div id="app">
        <BrowserRouter>
          <ToastProvider>
            <TradeDraftProvider>
              <RouterBody />
            </TradeDraftProvider>
          </ToastProvider>
        </BrowserRouter>
      </div>
    </MobileGate>
  );
}
