import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGKState } from '../../hooks/useGKState';
import { getNewTradeBlockTitle, isNewTradeBlocked } from '../../lib/tradeAccess';

export function NewTradeButton({
  className = 'btn btn-primary btn-full btn-lg',
  children = '+ New Trade',
}: {
  className?: string;
  children?: React.ReactNode;
}): React.ReactElement {
  const st = useGKState();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  void tick;

  const locked = isNewTradeBlocked(st);
  const title = getNewTradeBlockTitle(st);

  if (locked) {
    return (
      <span className={`${className} btn-disabled`} aria-disabled="true" title={title}>
        {children}
      </span>
    );
  }

  return (
    <Link className={className} to="/trade">
      {children}
    </Link>
  );
}
