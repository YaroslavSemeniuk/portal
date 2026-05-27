import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTradeDraft } from '../../app/tradeDraft';
import { useToast } from '../../app/toast';
import {
  applyDemoScenario,
  DEMO_SCENARIO_GROUPS,
  isDemoScenarioDisabled,
  type DemoScenarioId,
} from '../../lib/demoScenarios';
import { dailyLossUsagePct, isDailyLossBlocked, isDailyLossWarning } from '../../lib/riskMetrics';
import { getRulesStaleReason } from '../../lib/store';
import { useGKState } from '../../hooks/useGKState';

function activeScenarioHint(st: ReturnType<typeof useGKState>): string | null {
  const stale = getRulesStaleReason(st);
  if (stale === 'epoch') return 'Firm update active';
  if (stale === 'age') return '31+ days stale';
  if (isDailyLossBlocked(st)) return 'Daily locked';
  if (isDailyLossWarning(st)) return `Daily ${Math.round(dailyLossUsagePct(st))}%`;
  return null;
}

export function DemoSimulator(): React.ReactElement | null {
  const loc = useLocation();
  const toast = useToast();
  const st = useGKState();
  const { resetDraft } = useTradeDraft();
  const [open, setOpen] = useState(false);

  if (loc.pathname === '/entry' || loc.pathname === '/session-ended') return null;

  const hint = activeScenarioHint(st);

  const run = (id: DemoScenarioId) => {
    applyDemoScenario(id, { resetDraft, toast });
    if (id !== 'reset') setOpen(false);
  };

  return (
    <div className={`demo-simulator ${open ? 'is-open' : ''}`}>
      {open ? (
        <div className="demo-simulator-panel" role="region" aria-label="Demo scenario controls">
          <div className="demo-simulator-head">
            <span className="demo-simulator-title">Demo scenarios</span>
            <button type="button" className="demo-simulator-close" onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
          </div>

          <button type="button" className="demo-simulator-reset" onClick={() => run('reset')}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset demo
          </button>

          {DEMO_SCENARIO_GROUPS.map((group) => (
            <div key={group.label} className="demo-simulator-group">
              <div className="demo-simulator-group-label">{group.label}</div>
              <div className="demo-simulator-pills">
                {group.scenarios.map((scenario) => {
                  const disabled = isDemoScenarioDisabled(scenario, st);
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      className="demo-simulator-pill"
                      disabled={disabled}
                      title={disabled ? 'Confirm rules first' : undefined}
                      onClick={() => run(scenario.id)}
                    >
                      {scenario.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="demo-simulator-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Demo scenario controls"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        Demo
        {hint ? <span className="demo-simulator-hint">{hint}</span> : null}
      </button>
    </div>
  );
}
