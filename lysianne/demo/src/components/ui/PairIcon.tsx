import { useId, type ReactElement } from 'react';

function normIconClass(iconClass: string): string {
  return String(iconClass || '')
    .trim()
    .toLowerCase();
}

function PairGlyph({
  kind,
  size,
}: {
  kind: 'eur' | 'gbp' | 'usd' | 'btc';
  size: number;
}): ReactElement {
  const uid = useId().replace(/:/g, '');
  const g = `${uid}-${kind}`;

  const stops: Record<typeof kind, [string, string]> = {
    eur: ['#4F46E5', '#7C3AED'],
    gbp: ['#DC2626', '#9333EA'],
    usd: ['#059669', '#10B981'],
    btc: ['#F59E0B', '#EA580C'],
  };
  const [c0, c1] = stops[kind];

  const sym: Record<typeof kind, string> = {
    eur: '\u20AC',
    gbp: '\u00A3',
    usd: '\u0024',
    btc: '\u20BF',
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="pair-icon-img"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
    >
      <defs>
        <linearGradient id={g} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c0} />
          <stop offset="100%" stopColor={c1} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${g})`} />
      <text
        x="16"
        y={kind === 'btc' ? 22 : 21}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize={kind === 'btc' ? 15 : 16}
        fill="#fff"
      >
        {sym[kind]}
      </text>
    </svg>
  );
}

const KNOWN = new Set(['eur', 'gbp', 'usd', 'btc']);

export function PairIcon({
  iconClass,
  label,
  size = 32,
  className = '',
}: {
  iconClass: string;
  label: string;
  size?: number;
  className?: string;
}): ReactElement {
  const k = normIconClass(iconClass);
  const rootClass = `pair-icon pair-icon--img ${k} ${className}`.trim();
  const dim = { width: size, height: size } as const;

  if (!KNOWN.has(k)) {
    return (
      <div className={`pair-icon ${k} ${className}`.trim()} style={dim} title={label}>
        {label}
      </div>
    );
  }

  return (
    <div className={rootClass} style={{ ...dim }} title={label}>
      <PairGlyph kind={k as 'eur' | 'gbp' | 'usd' | 'btc'} size={size} />
    </div>
  );
}
