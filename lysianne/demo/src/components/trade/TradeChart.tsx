import { useEffect, useRef, useState } from 'react';
import {
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import { formatBucketLabel } from '../../lib/format';
import { Sim } from '../../lib/sim';
import { CHART_COLORS, type ChartSeriesType } from '../../lib/chartConstants';
import type { Candle } from '../../lib/types';

/** Max bars (50) shown on first paint / after TF change (cap zoom-out). */
const DEFAULT_VISIBLE_BARS = 50;
/** Must stay in sync with `timeScale.rightOffset` below (whitespace past last bar). */
const CHART_RIGHT_OFFSET = 6;

function setLastBarsVisible(chart: IChartApi, totalBars: number): void {
  if (totalBars <= 0) return;
  const last = totalBars - 1;
  const visible = Math.min(DEFAULT_VISIBLE_BARS, totalBars);
  const from = last - visible + 1;
  chart.timeScale().setVisibleLogicalRange({ from, to: last + CHART_RIGHT_OFFSET });
}

export interface TradeChartProps {
  symbol: string;
  tfMinutes: number;
  seriesType: ChartSeriesType;
  entry: number | null;
  sl: number | null;
  tp: number | null;
  fitRequestId?: number;
}

export function TradeChart({ symbol, tfMinutes, seriesType, entry, sl, tp, fitRequestId = 0 }: TradeChartProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | null>(null);
  const entryLineRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']> | null>(null);
  const slLineRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']> | null>(null);
  const tpLineRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']> | null>(null);
  const [seriesReady, setSeriesReady] = useState(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: CHART_COLORS.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid, visible: true },
        horzLines: { color: CHART_COLORS.grid, visible: true },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        scaleMargins: { top: 0.1, bottom: 0.08 },
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: CHART_RIGHT_OFFSET,
        barSpacing: 7,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: CHART_COLORS.cross, width: 1, style: 2, labelBackgroundColor: '#1A1330' },
        horzLine: { color: CHART_COLORS.cross, width: 1, style: 2, labelBackgroundColor: '#1A1330' },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true } },
      width: el.clientWidth,
      height: el.clientHeight || 480,
    });

    chartRef.current = chart;
    const candles = Sim.getAggregatedCandles(symbol, tfMinutes);

    let main: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>;
    if (seriesType === 'candles') {
      main = chart.addCandlestickSeries({
        upColor: CHART_COLORS.up,
        downColor: CHART_COLORS.down,
        borderUpColor: CHART_COLORS.up,
        borderDownColor: CHART_COLORS.down,
        wickUpColor: CHART_COLORS.up,
        wickDownColor: CHART_COLORS.down,
      });
      main.setData(candles.map((c: Candle) => ({ ...c, time: c.time as Time })));
    } else if (seriesType === 'line') {
      main = chart.addLineSeries({
        color: CHART_COLORS.line,
        lineWidth: 2,
        priceLineVisible: true,
        priceLineColor: CHART_COLORS.line,
        priceLineStyle: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: CHART_COLORS.lineHi,
        crosshairMarkerBackgroundColor: CHART_COLORS.line,
      });
      main.setData(candles.map((c: Candle) => ({ time: c.time as Time, value: c.close })));
    } else {
      main = chart.addAreaSeries({
        lineColor: CHART_COLORS.line,
        topColor: 'rgba(181,160,255,0.45)',
        bottomColor: 'rgba(181,160,255,0)',
        lineWidth: 2,
        priceLineColor: CHART_COLORS.line,
        priceLineStyle: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: CHART_COLORS.lineHi,
        crosshairMarkerBackgroundColor: CHART_COLORS.line,
      });
      main.setData(candles.map((c: Candle) => ({ time: c.time as Time, value: c.close })));
    }
    seriesRef.current = main;
    setSeriesReady((v) => v + 1);

    const unsubTick = Sim.on('tick', (t: unknown) => {
      const tick = t as { symbol: string };
      if (tick.symbol !== symbol || !seriesRef.current) return;
      const bucket = Sim.getCurrentBucket(symbol, tfMinutes);
      if (!bucket) return;
      const s = seriesRef.current;
      if (seriesType === 'candles') {
        (s as ISeriesApi<'Candlestick'>).update({
          time: bucket.time as Time,
          open: bucket.open,
          high: bucket.high,
          low: bucket.low,
          close: bucket.close,
        });
      } else {
        (s as ISeriesApi<'Line'>).update({ time: bucket.time as Time, value: bucket.close });
      }
    });

    const tooltip = document.getElementById('chart-tooltip');
    const cttTime = document.getElementById('ctt-time');
    const cttO = document.getElementById('ctt-o');
    const cttH = document.getElementById('ctt-h');
    const cttL = document.getElementById('ctt-l');
    const cttC = document.getElementById('ctt-c');
    const cttChg = document.getElementById('ctt-chg');

    const onCrosshairMove = (param: MouseEventParams) => {
      if (!tooltip || !cttTime || !cttO || !cttH || !cttL || !cttC || !cttChg) return;
      if (!param.time || !param.point || param.point.x < 0) {
        tooltip.hidden = true;
        return;
      }
      const data = param.seriesData.get(main);
      if (!data) {
        tooltip.hidden = true;
        return;
      }
      tooltip.hidden = false;
      const meta = Sim.getMeta(symbol);
      const decimals = meta?.decimals ?? 5;
      const fmtP = (n: number | undefined) => (n == null ? '—' : Number(n).toFixed(decimals));
      const row = data as { open?: number; high?: number; low?: number; close?: number; value?: number };
      let o: number;
      let h: number;
      let l: number;
      let c: number;
      if (row.open != null) {
        o = row.open;
        h = row.high ?? o;
        l = row.low ?? o;
        c = row.close ?? o;
      } else {
        o = h = l = c = row.value ?? 0;
      }
      const change = c - o;
      const changePct = o ? (change / o) * 100 : 0;
      const up = change >= 0;
      const timeVal = typeof param.time === 'number' ? param.time : Number(param.time);
      cttTime.textContent = formatBucketLabel(timeVal, tfMinutes);
      cttO.textContent = fmtP(o);
      cttH.textContent = fmtP(h);
      cttL.textContent = fmtP(l);
      cttC.textContent = fmtP(c);
      cttChg.textContent = `${up ? '+' : ''}${change.toFixed(decimals)} (${up ? '+' : ''}${changePct.toFixed(2)}%)`;
      cttChg.className = `ct-v ${up ? 'up' : 'down'}`;

      const rect = el.getBoundingClientRect();
      const tw = tooltip.offsetWidth || 140;
      const th = tooltip.offsetHeight || 120;
      let x = param.point.x + 16;
      let y = param.point.y + 16;
      if (x + tw > rect.width - 8) x = param.point.x - tw - 16;
      if (y + th > rect.height - 8) y = rect.height - th - 8;
      if (x < 8) x = 8;
      if (y < 8) y = 8;
      tooltip.style.transform = `translate(${x}px, ${y}px)`;
    };

    chart.subscribeCrosshairMove(onCrosshairMove);

    setLastBarsVisible(chart, candles.length);

    const onResize = () => {
      if (chartRef.current && hostRef.current) {
        chartRef.current.resize(hostRef.current.clientWidth, hostRef.current.clientHeight || 480);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      unsubTick();
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      entryLineRef.current = slLineRef.current = tpLineRef.current = null;
    };
  }, [symbol, tfMinutes, seriesType]);

  useEffect(() => {
    if (!fitRequestId || !chartRef.current) return;
    chartRef.current.timeScale().fitContent();
  }, [fitRequestId]);

  useEffect(() => {
    const main = seriesRef.current;
    if (!main || !('createPriceLine' in main)) return;

    if (entryLineRef.current) {
      try {
        main.removePriceLine(entryLineRef.current);
      } catch {
        /* ignore */
      }
    }
    if (slLineRef.current) {
      try {
        main.removePriceLine(slLineRef.current);
      } catch {
        /* ignore */
      }
    }
    if (tpLineRef.current) {
      try {
        main.removePriceLine(tpLineRef.current);
      } catch {
        /* ignore */
      }
    }
    entryLineRef.current = slLineRef.current = tpLineRef.current = null;

    if (entry != null && entry > 0) {
      entryLineRef.current = main.createPriceLine({
        price: entry,
        color: CHART_COLORS.entry,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'Entry',
      });
    }
    if (sl != null && sl > 0) {
      slLineRef.current = main.createPriceLine({
        price: sl,
        color: CHART_COLORS.sl,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SL',
      });
    }
    if (tp != null && tp > 0) {
      tpLineRef.current = main.createPriceLine({
        price: tp,
        color: CHART_COLORS.tp,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'TP',
      });
    }
  }, [entry, sl, tp, seriesReady, symbol, tfMinutes, seriesType]);

  return <div className="chart-canvas" ref={hostRef} id="chart-canvas" />;
}
