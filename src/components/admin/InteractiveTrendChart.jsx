'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

const CHART_WIDTH = 800;
const CHART_HEIGHT = 200;
const GRID_ROWS = 4;
const PAD_TOP = 8;
const PAD_BOTTOM = 8;

const toSafe = (series = []) => {
  if (!Array.isArray(series) || !series.length) return [0, 0, 0, 0, 0, 0, 0];
  return series.map((v) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; });
};

const buildGeometry = (cur = [], prev = []) => {
  const current = toSafe(cur);
  const previous = toSafe(prev);
  const count = Math.max(current.length, previous.length, 2);
  const c = Array.from({ length: count }, (_, i) => current[i] ?? 0);
  const p = Array.from({ length: count }, (_, i) => previous[i] ?? 0);
  const max = Math.max(...c, ...p, 1);
  const min = Math.min(...c, ...p, 0);
  const range = Math.max(1, max - min);
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const step = count > 1 ? CHART_WIDTH / (count - 1) : CHART_WIDTH;

  const toY = (v) => PAD_TOP + plotH - ((v - min) / range) * plotH;
  const pt = (v, i) => ({ x: step * i, y: toY(v), value: v });

  const cp = c.map(pt);
  const pp = p.map(pt);

  const polyline = (pts) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return { c, p, cp, pp, cLine: polyline(cp), pLine: polyline(pp), count, step };
};

export default function InteractiveTrendChart({
  labels = [],
  currentSeries = [],
  previousSeries = [],
  currentLabel = 'Current',
  previousLabel = 'Previous',
  formatValue = (v) => String(v ?? 0),
  height = 200,
}) {
  const [hoverIdx, setHoverIdx] = useState(-1);
  const svgRef = useRef(null);

  const geo = useMemo(() => buildGeometry(currentSeries, previousSeries), [currentSeries, previousSeries]);

  const safeLabels = Array.isArray(labels) && labels.length === geo.count
    ? labels
    : Array.from({ length: geo.count }, (_, i) => `${i + 1}`);

  const isHovering = hoverIdx >= 0;
  const activeIdx = isHovering ? Math.max(0, Math.min(geo.count - 1, hoverIdx)) : -1;
  const cp = activeIdx >= 0 ? geo.cp[activeIdx] : null;
  const pp = activeIdx >= 0 ? geo.pp[activeIdx] : null;
  const cv = activeIdx >= 0 ? (geo.c[activeIdx] ?? 0) : 0;
  const pv = activeIdx >= 0 ? (geo.p[activeIdx] ?? 0) : 0;

  const tooltipXPct = activeIdx >= 0 && geo.count > 1 ? (activeIdx / (geo.count - 1)) * 100 : 50;
  const isLeft = tooltipXPct > 60;

  const handleMouseMove = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg || geo.count < 2) return;
    const rect = svg.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const pct = relX / rect.width;
    const raw = pct * (geo.count - 1);
    setHoverIdx(Math.round(Math.max(0, Math.min(geo.count - 1, raw))));
  }, [geo.count]);

  const handleLeave = useCallback(() => setHoverIdx(-1), []);

  const chartH = Math.max(100, height);

  return (
    <div className="space-y-1.5">
      <div className="relative select-none">
        {/* Tooltip — only while hovering */}
        {isHovering && activeIdx >= 0 && (
          <div
            className="pointer-events-none absolute z-20 min-w-[140px] rounded-xl border border-slate-100 bg-white px-2.5 py-2 shadow-lg"
            style={{
              top: 0,
              ...(isLeft
                ? { right: `${100 - tooltipXPct}%`, transform: 'translateX(40%)' }
                : { left: `${tooltipXPct}%`, transform: 'translateX(-40%)' }),
            }}
          >
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {safeLabels[activeIdx] || '—'}
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                  {currentLabel}
                </span>
                <span className="text-xs font-bold text-slate-900">{formatValue(cv)}</span>
              </div>
              {previousLabel !== 'no prior period' && (
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    {previousLabel}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{formatValue(pv)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SVG Chart */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full cursor-crosshair"
          style={{ height: `${chartH}px` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleLeave}
        >
          {/* Grid lines */}
          {Array.from({ length: GRID_ROWS + 1 }).map((_, i) => {
            const y = PAD_TOP + ((CHART_HEIGHT - PAD_TOP - PAD_BOTTOM) / GRID_ROWS) * i;
            return (
              <line key={i} x1="0" y1={y.toFixed(1)} x2={CHART_WIDTH} y2={y.toFixed(1)}
                stroke="#f1f5f9" strokeWidth="1" />
            );
          })}

          {/* Vertical cursor line */}
          {hoverIdx >= 0 && cp && (
            <line
              x1={cp.x.toFixed(1)} y1="0" x2={cp.x.toFixed(1)} y2={CHART_HEIGHT}
              stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4"
            />
          )}

          {/* Area fill under current line */}
          {geo.cp.length > 1 && (
            <polygon
              points={`${geo.cp[0].x},${CHART_HEIGHT} ${geo.cLine} ${geo.cp[geo.cp.length - 1].x},${CHART_HEIGHT}`}
              fill="url(#areaGrad)"
              opacity="0.35"
            />
          )}

          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Previous line */}
          <polyline fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="6 4" points={geo.pLine} />

          {/* Current line */}
          <polyline fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={geo.cLine} />

          {/* Hover dots */}
          {hoverIdx >= 0 && cp && (
            <>
              <circle cx={cp.x.toFixed(1)} cy={cp.y.toFixed(1)} r="7" fill="#0f172a" fillOpacity="0.08" />
              <circle cx={cp.x.toFixed(1)} cy={cp.y.toFixed(1)} r="4" fill="#0f172a" />
              <circle cx={cp.x.toFixed(1)} cy={cp.y.toFixed(1)} r="2" fill="white" />
            </>
          )}
          {hoverIdx >= 0 && pp && (
            <circle cx={pp.x.toFixed(1)} cy={pp.y.toFixed(1)} r="3" fill="#cbd5e1" />
          )}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${geo.count}, minmax(0, 1fr))` }}>
        {safeLabels.map((lbl, i) => (
          <span key={i} className={`text-center text-[10px] font-medium transition-colors ${
            isHovering && i === activeIdx ? 'text-slate-700' : 'text-slate-400'
          }`}>
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}
