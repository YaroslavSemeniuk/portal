import { useEffect, useState } from 'react';

function isMobile(): boolean {
  return window.innerWidth < 1440;
}

export function MobileGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const [narrow, setNarrow] = useState(isMobile);

  useEffect(() => {
    const handler = () => setNarrow(isMobile());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (narrow) {
    return (
      <div className="mobile-gate">
        <div className="mobile-gate-card">
          <div className="mobile-gate-logo">G</div>
          <div className="mobile-gate-title">Desktop required.</div>
          <div className="mobile-gate-sub">
            This platform is designed for desktop use. A mobile companion is planned for Phase 2.
          </div>
          <div className="mobile-gate-hint">
            Please continue on a desktop browser at 1440px or wider.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
