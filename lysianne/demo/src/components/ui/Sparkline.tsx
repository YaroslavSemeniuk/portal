import { useEffect, useRef } from 'react';

export function Sparkline({
  points,
  className,
  height = 32,
}: {
  points: number[];
  className?: string;
  height?: number;
}): React.ReactElement {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg || !points.length) return;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const w = 100;
    const h = height;
    const coords = points.map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return [x, y] as const;
    });
    const d = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('');
    const dArea = `${d} L${w},${h} L0,${h} Z`;
    svg.innerHTML =
      `<path class="spark-area" d="${dArea}" vector-effect="non-scaling-stroke"/>` +
      `<path class="spark-line" d="${d}" vector-effect="non-scaling-stroke"/>`;
  }, [points, height]);
  return <svg ref={ref} className={className} preserveAspectRatio="none" viewBox={`0 0 100 ${height}`} style={{ height }} />;
}
