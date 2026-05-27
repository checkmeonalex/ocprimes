'use client';
import { useMemo, useState } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDateKey = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((num) => Number(num));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatLabel = (value) => {
  const date = parseDateKey(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const buildMonthGrid = (year, monthIndex) => {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startOffset = firstDay.getDay();
  const days = [];

  for (let i = 0; i < startOffset; i += 1) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, monthIndex, day));
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
};

function DateRangePopover({ startDate, endDate, onApply, onClose }) {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [draftStart, setDraftStart] = useState(startDate || '');
  const [draftEnd, setDraftEnd] = useState(endDate || '');
  const viewDate = useMemo(() => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1), [monthOffset, today]);
  const days = useMemo(
    () => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const handleSelect = (date) => {
    if (!date) return;
    const selected = toDateKey(date);
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(selected);
      setDraftEnd('');
      return;
    }
    if (draftStart && !draftEnd) {
      if (selected < draftStart) {
        setDraftStart(selected);
        setDraftEnd(draftStart);
      } else {
        setDraftEnd(selected);
      }
    }
  };

  const isInRange = (dateKey) => {
    if (!draftStart || !draftEnd || !dateKey) return false;
    return dateKey >= draftStart && dateKey <= draftEnd;
  };

  const isStart = (dateKey) => draftStart && dateKey === draftStart;
  const isEnd = (dateKey) => draftEnd && dateKey === draftEnd;

  return (
    <div className="w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((prev) => prev - 1)}
          className="rounded-full border border-slate-200 p-1 text-slate-500"
          aria-label="Previous month"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="text-sm font-semibold text-slate-700">
          {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          onClick={() => setMonthOffset((prev) => prev + 1)}
          className="rounded-full border border-slate-200 p-1 text-slate-500"
          aria-label="Next month"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] font-semibold text-slate-400">
        {DAYS.map((day) => (
          <span key={day} className="text-center">
            {day}
          </span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-xs">
        {days.map((date, index) => {
          if (!date) {
            return <span key={`empty-${index}`} className="h-8" />;
          }
          const key = toDateKey(date);
          const active = isStart(key) || isEnd(key);
          const inRange = isInRange(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(date)}
              className={`h-8 rounded-lg transition ${
                active
                  ? 'bg-slate-900 text-white'
                  : inRange
                    ? 'bg-slate-100 text-slate-700'
                    : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <div>
          <p className="font-semibold text-slate-600">Start</p>
          <p>{formatLabel(draftStart) || 'Select date'}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-600">End</p>
          <p>{formatLabel(draftEnd) || 'Select date'}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setDraftStart('');
            setDraftEnd('');
          }}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            onApply({ start: draftStart, end: draftEnd });
            onClose();
          }}
          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default DateRangePopover;
