'use client';

import { useMemo, useState } from 'react';

const CHART_WIDTH = 860;
const CHART_HEIGHT = 280;
const GRID_ROWS = 5;

const toSafeSeries = (series = []) => {
  if (!Array.isArray(series) || !series.length) return [0, 0, 0, 0, 0, 0, 0];
  return series.map((value) => {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? amount : 0;
  });
};

const clampIndex = (index, length) => {
  if (!Number.isFinite(index)) return 0;
  if (length <= 1) return 0;
  return Math.max(0, Math.min(length - 1, index));
};

const buildSeriesGeometry = (currentSeries = [], previousSeries = []) => {
  const current = toSafeSeries(currentSeries);
  const previous = toSafeSeries(previousSeries);
  const pointCount = Math.max(current.length, previous.length, 2);
  const mergedCurrent = Array.from({ length: pointCount }, (_, index) => current[index] ?? 0);
  const mergedPrevious = Array.from({ length: pointCount }, (_, index) => previous[index] ?? 0);
  const max = Math.max(...mergedCurrent, ...mergedPrevious, 1);
  const min = Math.min(...mergedCurrent, ...mergedPrevious, 0);
  const range = Math.max(1, max - min);
  const step = pointCount > 1 ? CHART_WIDTH / (pointCount - 1) : CHART_WIDTH;

  const toPoint = (value, index) => ({
    x: step * index,
    y: CHART_HEIGHT - ((value - min) / range) * CHART_HEIGHT,
    value,
  });

  const currentPoints = mergedCurrent.map(toPoint);
  const previousPoints = mergedPrevious.map(toPoint);

  return {
    currentValues: mergedCurrent,
    previousValues: mergedPrevious,
    currentPoints,
    previousPoints,
    currentPolyline: currentPoints.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '),
    previousPolyline: previousPoints.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '),
  };
};

export default function InteractiveTrendChart({
  labels = [],
  currentSeries = [],
  previousSeries = [],
  currentLabel = 'Current',
  previousLabel = 'Previous',
  formatValue = (value) => String(value ?? 0),
}) {
  const [activeIndex, setActiveIndex] = useState(-1);

  const geometry = useMemo(
    () => buildSeriesGeometry(currentSeries, previousSeries),
    [currentSeries, previousSeries],
  );

  const pointCount = geometry.currentPoints.length;
  const safeLabels =
    Array.isArray(labels) && labels.length === pointCount
      ? labels
      : Array.from({ length: pointCount }, (_, index) => `Point ${index + 1}`);

  const hoverIndex = clampIndex(activeIndex >= 0 ? activeIndex : pointCount - 1, pointCount);
  const currentPoint = geometry.currentPoints[hoverIndex];
  const previousPoint = geometry.previousPoints[hoverIndex];
  const currentValue = geometry.currentValues[hoverIndex] ?? 0;
  const previousValue = geometry.previousValues[hoverIndex] ?? 0;
  const tooltipLeftPercent = pointCount > 1 ? (hoverIndex / (pointCount - 1)) * 100 : 50;
  const tooltipTop = currentPoint
    ? Math.max(12, Math.min(CHART_HEIGHT - 116, currentPoint.y - 92))
    : 12;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          className="pointer-events-none absolute z-10 w-[220px] max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm transition-[top,left] duration-150"
          style={{ left: `${tooltipLeftPercent}%`, top: `${tooltipTop}px` }}
        >
          <p className="text-xs font-medium text-slate-500">{safeLabels[hoverIndex] || '—'}</p>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500">{currentLabel}</span>
              <span className="text-sm font-semibold text-slate-900">{formatValue(currentValue)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500">{previousLabel}</span>
              <span className="text-sm font-semibold text-slate-700">{formatValue(previousValue)}</span>
            </div>
          </div>
        </div>

        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-[280px] w-full">
          {Array.from({ length: GRID_ROWS }).map((_, index) => {
            const y = 40 + ((CHART_HEIGHT - 60) / (GRID_ROWS - 1)) * index;
            return (
              <path
                key={`grid-${index}`}
                d={`M0 ${y}h${CHART_WIDTH}`}
                stroke="#eef2f7"
                strokeWidth="1"
              />
            );
          })}

          {activeIndex >= 0 && currentPoint ? (
            <path
              d={`M${currentPoint.x} 0v${CHART_HEIGHT}`}
              stroke="#d4d4d8"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
          ) : null}

          <polyline fill="none" stroke="#111111" strokeWidth="3" points={geometry.currentPolyline} />
          <polyline fill="none" stroke="#cbd5e1" strokeWidth="3" points={geometry.previousPolyline} />

          {activeIndex >= 0 && currentPoint ? (
            <>
              <circle cx={currentPoint.x} cy={currentPoint.y} r="5.5" fill="#111111" />
              <circle cx={currentPoint.x} cy={currentPoint.y} r="10" fill="none" stroke="#111111" strokeOpacity="0.15" strokeWidth="6" />
            </>
          ) : null}

          {activeIndex >= 0 && previousPoint ? (
            <circle cx={previousPoint.x} cy={previousPoint.y} r="4.5" fill="#cbd5e1" />
          ) : null}
        </svg>

        <div className="absolute inset-0 z-20 grid" style={{ gridTemplateColumns: `repeat(${pointCount}, minmax(0, 1fr))` }}>
          {safeLabels.map((label, index) => (
            <button
              key={`${label}-${index}`}
              type="button"
              className="h-full w-full cursor-pointer bg-transparent"
              aria-label={`Inspect ${label}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onTouchStart={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(safeLabels.length, 1)}, minmax(0, 1fr))` }}
      >
        {safeLabels.map((label, index) => (
          <span
            key={label}
            className={`text-center text-[11px] font-medium ${
              index === hoverIndex ? 'text-slate-700' : 'text-slate-400'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
