"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Value format: YYYY-MM-DDTHH:mm (datetime-local compatible) */
function parseValue(value: string): { date: Date; valid: boolean } {
  if (!value || value.length < 16) return { date: new Date(), valid: false };
  const d = new Date(value + "Z");
  if (Number.isNaN(d.getTime())) return { date: new Date(), valid: false };
  return { date: d, valid: true };
}

function formatForInput(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function formatDisplay(d: Date): string {
  const opts = { timeZone: "UTC" as const };
  const weekday = d.toLocaleDateString("en-US", { ...opts, weekday: "short" });
  const date = d.toLocaleDateString("en-US", { ...opts, month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { ...opts, hour: "numeric", minute: "2-digit", hour12: true });
  return `${weekday}, ${date} at ${time} UTC`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function DateTimePicker({
  id,
  value,
  onChange,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { date: initialDate, valid } = parseValue(value);
  const [viewDate, setViewDate] = useState(() => new Date(initialDate.getTime()));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [hour, setHour] = useState(initialDate.getUTCHours());
  const [minute, setMinute] = useState(initialDate.getUTCMinutes());
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const syncFromValue = useCallback((v: string) => {
    const { date, valid: ok } = parseValue(v);
    if (ok) {
      setViewDate(new Date(date.getTime()));
      setSelectedDate(new Date(date.getTime()));
      setHour(date.getUTCHours());
      setMinute(date.getUTCMinutes());
    }
  }, []);

  useEffect(() => {
    syncFromValue(value);
  }, [value, syncFromValue]);

  const commit = useCallback(
    (d: Date, h: number, m: number) => {
      const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m, 0, 0));
      onChange(formatForInput(out));
    },
    [onChange]
  );

  const handleSelectDay = useCallback(
    (d: Date) => {
      setSelectedDate(d);
      commit(d, hour, minute);
    },
    [hour, minute, commit]
  );

  const handleTimeChange = useCallback(
    (newHour: number, newMinute: number) => {
      setHour(newHour);
      setMinute(newMinute);
      commit(selectedDate, newHour, newMinute);
    },
    [selectedDate, commit]
  );

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const year = viewDate.getUTCFullYear();
  const month = viewDate.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const startOffset = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(Date.UTC(year, month, d)));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-left text-surface-900 placeholder-surface-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 ${className}`}
      >
        <span className={valid ? "text-surface-900" : "text-surface-500"}>
          {valid ? formatDisplay(selectedDate) : "Select date and time"}
        </span>
        <span className="text-surface-500" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-surface-200 bg-white p-4 shadow-lg"
          role="dialog"
          aria-label="Pick date and time"
        >
          <div className="flex items-center justify-between border-b border-surface-200 pb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(Date.UTC(year, month - 1, 1)))}
              className="rounded p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-900"
              aria-label="Previous month"
            >
              ←
            </button>
            <span className="text-sm font-medium text-surface-900">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(Date.UTC(year, month + 1, 1)))}
              className="rounded p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-900"
              aria-label="Next month"
            >
              →
            </button>
          </div>

          <div className="mt-3">
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase tracking-wider text-surface-500">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-0.5">
              {weeks.flat().map((d, i) =>
                d ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectDay(d)}
                    className={`h-8 rounded text-sm transition-colors ${
                      isSameDay(d, selectedDate)
                        ? "bg-primary-600 text-white"
                        : "text-surface-700 hover:bg-surface-100"
                    }`}
                  >
                    {d.getUTCDate()}
                  </button>
                ) : (
                  <span key={i} className="h-8" />
                )
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-surface-200 pt-3">
            <span className="text-xs text-surface-500">Time (UTC)</span>
            <div className="flex items-center gap-2">
              <select
                value={hour}
                onChange={(e) => handleTimeChange(Number(e.target.value), minute)}
                className="rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <span className="text-surface-500">:</span>
              <select
                value={minute}
                onChange={(e) => handleTimeChange(hour, Number(e.target.value))}
                className="rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
