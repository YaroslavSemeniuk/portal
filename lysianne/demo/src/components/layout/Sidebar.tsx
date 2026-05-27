import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fmt } from '../../lib/format';
import {
  dailyLossBarClass,
  dailyLossBarTier,
  dailyLossUsagePct,
  dailyLossValueClass,
} from '../../lib/riskMetrics';
import { getRulesStaleReason, isTradingBlocked } from '../../lib/store';
import { useGKState } from '../../hooks/useGKState';

function NavIcon({ id }: { id: string }): React.ReactElement {
  if (id === 'dashboard')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12l9-9 9 9M5 10v10h14V10" />
      </svg>
    );
  if (id === 'trade')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18M7 14l4-4 4 4 5-7" />
      </svg>
    );
  if (id === 'journal')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 9h16M9 4v16" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

const NAV = [
  { id: 'dashboard', to: '/dashboard', label: 'Dashboard' },
  { id: 'trade', to: '/trade', label: 'Trade' },
  { id: 'journal', to: '/journal', label: 'Journal' },
  { id: 'rules', to: '/rules', label: 'Rules' },
] as const;

function InfoIcon(): React.ReactElement {
  return (
    <svg className="sb-acc-info-svg" viewBox="0 0 24 24" width={14} height={14} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4} />
      <path
        d="M12 16.5v-5M12 7.75h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DrawdownCushionRow({
  peak,
  ddFloor,
  ddCushion,
  ddPct,
  drawdownLim,
}: {
  peak: number;
  ddFloor: number;
  ddCushion: number;
  ddPct: number;
  drawdownLim: number;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const usageOfLimit = drawdownLim > 0 ? Math.min(100, (ddPct / drawdownLim) * 100) : 0;
  const barWarn = ddPct >= 0.85 * drawdownLim;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rowRef} className={`sb-acc-row sb-acc-row-dd ${open ? 'is-open' : ''}`}>
      <div className="sb-acc-head">
        <span className="sb-acc-l">Drawdown cushion</span>
        <span className="sb-acc-v">${fmt(ddCushion, 0)} left</span>
      </div>
      <div className="sb-acc-bar">
        <div className={`sb-acc-fill ${barWarn ? 'warn' : ''}`} style={{ width: `${usageOfLimit}%` }} />
      </div>
      <div className="sb-acc-dd-foot">
        <span className="sb-acc-sub">
          Floor ${fmt(ddFloor, 0)} · {ddPct.toFixed(1)}% of {drawdownLim}% limit
        </span>
        <button
          type="button"
          className="sb-acc-info-btn"
          aria-label="Show drawdown details"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <InfoIcon />
        </button>
      </div>
      {open ? (
        <div className="sb-acc-dd-popover" role="dialog" aria-label="Drawdown cushion details">
          <dl className="sb-acc-dd-grid">
            <div className="sb-acc-dd-stat">
              <dt>Peak equity</dt>
              <dd>${fmt(peak, 0)}</dd>
            </div>
            <div className="sb-acc-dd-stat">
              <dt>Min balance</dt>
              <dd>${fmt(ddFloor, 0)}</dd>
            </div>
            <div className="sb-acc-dd-stat">
              <dt>Cushion</dt>
              <dd>${fmt(ddCushion, 0)}</dd>
            </div>
          </dl>
          <p className="sb-acc-dd-note">
            Trailing {drawdownLim}% from peak. Balance must stay above the floor or the account fails evaluation.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({ active }: { active?: string }): React.ReactElement {
  const st = useGKState();
  const loc = useLocation();
  const pathId = (loc.pathname.replace(/^\//, '') || 'dashboard') as string;
  const effective = active !== undefined && active !== '' ? active : pathId;

  const dailyUsage = dailyLossUsagePct(st);
  const lossTier = dailyLossBarTier(dailyUsage);
  const lossClass = dailyLossBarClass(lossTier);
  const lossValClass = dailyLossValueClass(lossTier);
  const peak = Math.max(st.equityHighWaterMark ?? st.startingBalance, st.balance);
  const ddPct = peak > 0 ? Math.max(0, ((peak - st.balance) / peak) * 100) : 0;
  const ddFloor = peak * (1 - st.rules.drawdownLim / 100);
  const ddCushion = Math.max(0, st.balance - ddFloor);
  const tradingBlocked = isTradingBlocked(st);

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">P</div>
        <div>
          <div className="logo-text">[Platform]</div>
          <div className="logo-tagline">Trade with Discipline</div>
        </div>
      </div>
      <div className="sidebar-main">
        <div className="nav-section">Main</div>
        <nav className="sidebar-nav-list" aria-label="Main navigation">
          {NAV.map((n) => {
            const disabled = tradingBlocked && n.id !== 'rules';
            if (disabled) {
              return (
                <span
                  key={n.id}
                  className={`nav-item nav-item-disabled ${effective === n.id ? 'active' : ''}`}
                  aria-disabled="true"
                  title="Re-confirm your rules to resume trading"
                >
                  <span className="nav-icon">
                    <NavIcon id={n.id} />
                  </span>
                  <span className="nav-label">{n.label}</span>
                </span>
              );
            }
            return (
              <Link key={n.id} className={`nav-item ${effective === n.id ? 'active' : ''}`} to={n.to}>
                <span className="nav-icon">
                  <NavIcon id={n.id} />
                </span>
                <span className="nav-label">{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="nav-section nav-section-account">Account</div>
      <div className="sb-account">
        <div className="sb-acc-row">
          <div className="sb-acc-head">
            <span className="sb-acc-l">Daily allowance</span>
            <span className={`sb-acc-v ${lossValClass}`}>
              $
              {fmt(st.balance * (st.rules.dailyLoss / 100) - Math.abs(Math.min(0, st.dailyPnL)), 0)} left
            </span>
          </div>
          <div className="sb-acc-bar">
            <div className={`sb-acc-fill ${lossClass}`} style={{ width: `${dailyUsage}%` }} />
          </div>
        </div>
        <DrawdownCushionRow
          peak={peak}
          ddFloor={ddFloor}
          ddCushion={ddCushion}
          ddPct={ddPct}
          drawdownLim={st.rules.drawdownLim}
        />
        <div className="sb-acc-row">
          <div className="sb-acc-head">
            <span className="sb-acc-l">Trading days</span>
            <span className="sb-acc-v">
              {st.daysCounted} / {st.rules.minDays}
            </span>
          </div>
          <div className="sb-acc-bar">
            <div
              className="sb-acc-fill"
              style={{ width: `${Math.min(100, (st.daysCounted / st.rules.minDays) * 100)}%` }}
            />
          </div>
        </div>
        {tradingBlocked ? (
          <p className="sb-stale-hint">
            {getRulesStaleReason(st) === 'epoch'
              ? 'Firm rules updated — re-confirm on Rules tab.'
              : 'Rules 30+ days old — re-confirm on Rules tab.'}
          </p>
        ) : null}
      </div>
      <div className="sidebar-footer">
        <div className="user-avatar">A</div>
        <div className="user-info">
          <div className="u-name">Alex Trader</div>
          <div className="u-mail">demo mode</div>
        </div>
      </div>
    </aside>
  );
}
