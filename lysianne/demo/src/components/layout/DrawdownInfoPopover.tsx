import { useEffect, useRef, useState } from 'react';
import { fmt } from '../../lib/format';

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

export function DrawdownDetailsContent({
  peak,
  ddFloor,
  ddCushion,
  drawdownLim,
}: {
  peak: number;
  ddFloor: number;
  ddCushion: number;
  drawdownLim: number;
}): React.ReactElement {
  return (
    <>
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
    </>
  );
}

export function DrawdownTopbarDetailsContent({
  peak,
  ddPct,
  ddFloor,
  drawdownLim,
  ddUsageOfLimit,
}: {
  peak: number;
  ddPct: number;
  ddFloor: number;
  drawdownLim: number;
  ddUsageOfLimit: number;
}): React.ReactElement {
  const remainingPct = Math.max(0, drawdownLim - ddPct);

  return (
    <>
      <dl className="sb-acc-dd-grid">
        <div className="sb-acc-dd-stat">
          <dt>From peak</dt>
          <dd>{ddPct.toFixed(1)}%</dd>
        </div>
        <div className="sb-acc-dd-stat">
          <dt>Rule limit</dt>
          <dd>{drawdownLim}%</dd>
        </div>
        <div className="sb-acc-dd-stat">
          <dt>Remaining</dt>
          <dd>{remainingPct.toFixed(1)}%</dd>
        </div>
      </dl>
      <p className="sb-acc-dd-note">
        Trailing drawdown from peak equity (${fmt(peak, 0)}). The headline and bar show how much of your{' '}
        {drawdownLim}% allowance is used ({ddUsageOfLimit.toFixed(0)}%). At 100% the account hits the floor (
        ${fmt(ddFloor, 0)}) and fails evaluation.
      </p>
    </>
  );
}

/** Info button + popover for topbar drawdown bar */
export function DrawdownInfoPopover({
  peak,
  ddPct,
  ddFloor,
  drawdownLim,
  ddUsageOfLimit,
  onOpenChange,
}: {
  peak: number;
  ddPct: number;
  ddFloor: number;
  drawdownLim: number;
  ddUsageOfLimit: number;
  onOpenChange?: (open: boolean) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      onOpenChange?.(next);
      return next;
    });
  };

  return (
    <div ref={wrapRef} className="tb-dd-info-wrap">
      <button
        type="button"
        className="tb-acc-info-btn"
        aria-label="Show drawdown details"
        aria-expanded={open}
        onClick={toggle}
      >
        <InfoIcon />
      </button>
      {open ? (
        <div className="tb-dd-popover" role="dialog" aria-label="Drawdown details">
          <DrawdownTopbarDetailsContent
            peak={peak}
            ddPct={ddPct}
            ddFloor={ddFloor}
            drawdownLim={drawdownLim}
            ddUsageOfLimit={ddUsageOfLimit}
          />
        </div>
      ) : null}
    </div>
  );
}

export function DrawdownInfoButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      className="sb-acc-info-btn"
      aria-label="Show drawdown details"
      aria-expanded={open}
      onClick={onToggle}
    >
      <InfoIcon />
    </button>
  );
}
