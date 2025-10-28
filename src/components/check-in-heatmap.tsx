import { useEffect, useMemo, useState } from "react";

import type { DailySummary } from "@/types/check-in";

const DAYS_IN_WEEK = 7;
const CELL_SIZE = 12;
const CELL_GAP = 2;
const CELL_WITH_GAP = CELL_SIZE + CELL_GAP;
const DAY_LABEL_COLUMN_WIDTH = 40;

interface DayCell {
  date: Date;
  iso: string;
  count: number;
  isFuture: boolean;
  isPadding: boolean;
}

interface MonthMarker {
  label: string;
  columnIndex: number;
}

interface CheckInHeatmapProps {
  summaries: DailySummary[];
}

export default function CheckInHeatmap({ summaries }: CheckInHeatmapProps) {
  const [now, setNow] = useState<Date>(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  useEffect(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    setNow(date);
  }, []);

  const availableYears = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;
    return [currentYear, previousYear];
  }, []);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const summariesByYear = useMemo(() => {
    const map = new Map<number, DailySummary[]>();
    for (const summary of summaries) {
      const year = Number.parseInt(summary.date.slice(0, 4), 10);
      if (!map.has(year)) {
        map.set(year, []);
      }
      map.get(year)?.push(summary);
    }
    return map;
  }, [summaries]);

  const isYearSelected = selectedYear !== null;

  const { displayStart, displayEnd, currentSummaries } = useMemo(() => {
    if (isYearSelected && selectedYear) {
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31);
      yearStart.setHours(0, 0, 0, 0);
      yearEnd.setHours(0, 0, 0, 0);

      return {
        displayStart: yearStart,
        displayEnd: yearEnd,
        currentSummaries: summariesByYear.get(selectedYear) ?? [],
      };
    }

    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    start.setHours(0, 0, 0, 0);

    const startIso = formatDateKey(start);
    const endIso = formatDateKey(now);
    const rangeSummaries = summaries.filter((summary) => summary.date >= startIso && summary.date <= endIso);

    return {
      displayStart: start,
      displayEnd: now,
      currentSummaries: rangeSummaries,
    };
  }, [isYearSelected, selectedYear, summaries, summariesByYear, now]);

  const cellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const summary of currentSummaries) {
      map.set(summary.date, summary.count);
    }
    return map;
  }, [currentSummaries]);

  const { weeks, monthMarkers, totalWeeks } = useMemo(() => {
    return buildGrid({
      cellMap,
      displayStart,
      displayEnd,
    });
  }, [cellMap, displayStart, displayEnd]);

  const heatmapWidth = useMemo(() => {
    const innerWidth = totalWeeks * CELL_WITH_GAP;
    const gapBetweenLabelsAndGrid = 8; // gap-2 => 0.5rem => 8px
    return innerWidth + DAY_LABEL_COLUMN_WIDTH + gapBetweenLabelsAndGrid;
  }, [totalWeeks]);

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/60 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
        <span className="text-base font-medium text-zinc-700 dark:text-zinc-200">
          打卡热力图
        </span>
        <p>
          暂无打卡数据。完成第一次打卡后，将自动生成近 12 个月的坚持情况，并支持查看近两年的完整热力图。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-700 dark:bg-zinc-900/60">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
        <div
          className="flex flex-col gap-4 md:flex-shrink-0"
          style={{ width: "100%", maxWidth: `${heatmapWidth}px` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                打卡热力图
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {isYearSelected && selectedYear
                  ? `${selectedYear} 年的打卡频率`
                  : "最近 12 个月的打卡频率"}
                ，颜色越深代表当日打卡次数越多
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="w-full overflow-x-auto md:overflow-visible">
              <MonthLabels markers={monthMarkers} weekCount={totalWeeks} />
            </div>
            <div className="flex gap-2 overflow-x-auto md:overflow-visible">
              <DayLabels />
              <div
                className="flex gap-[2px]"
                style={{ width: `${totalWeeks * CELL_WITH_GAP}px` }}
              >
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[2px]">
                    {week.map((day) => (
                      <div
                        key={`${day.iso}-${day.date.getTime()}`}
                        className={`h-3 w-3 rounded-sm border border-transparent ${getCellClassName(day)}`}
                        title={day.isPadding ? undefined : `${day.iso} · ${day.count} 次打卡`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <HeatmapLegend />
        </div>

        <aside className="flex flex-col gap-4 rounded-2xl bg-white/70 p-4 text-sm text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-300">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            年份切换
          </span>
          <div className="flex flex-col gap-2">
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear((prev) => (prev === year ? null : year))}
                className={`w-full rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 ${
                  selectedYear === year
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-transparent text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function buildGrid({
  cellMap,
  displayStart,
  displayEnd,
}: {
  cellMap: Map<string, number>;
  displayStart: Date;
  displayEnd: Date;
}): { weeks: DayCell[][]; monthMarkers: MonthMarker[]; totalWeeks: number } {
  const rangeStart = startOfWeek(displayStart);
  const rangeEnd = startOfWeek(displayEnd);
  rangeEnd.setDate(rangeEnd.getDate() + (DAYS_IN_WEEK - 1));

  const weeks: DayCell[][] = [];
  const monthMarkers: MonthMarker[] = [];
  let current = new Date(rangeStart);
  let week: DayCell[] = [];
  let previousMonth = -1;

  while (current <= rangeEnd) {
    if (week.length === 0) {
      const weekStart = new Date(current);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + (DAYS_IN_WEEK - 1));

      const effectiveStart = weekStart < displayStart ? new Date(displayStart) : weekStart;
      const effectiveEnd = weekEnd > displayEnd ? new Date(displayEnd) : weekEnd;

      if (effectiveStart <= effectiveEnd) {
        const month = effectiveStart.getMonth();
        if (month !== previousMonth) {
          monthMarkers.push({ label: `${month + 1}月`, columnIndex: weeks.length });
          previousMonth = month;
        }
      }
    }

    const iso = formatDateKey(current);
    const count = cellMap.get(iso) ?? 0;
    const isFuture = current.getTime() > displayEnd.getTime();
    const isPadding = current < displayStart || current > displayEnd;

    week.push({
      date: new Date(current),
      iso,
      count,
      isFuture,
      isPadding,
    });

    if (week.length === DAYS_IN_WEEK) {
      weeks.push(week);
      week = [];
    }

    current.setDate(current.getDate() + 1);
  }

  if (week.length > 0) {
    while (week.length < DAYS_IN_WEEK) {
      const last = week[week.length - 1]?.date ?? new Date(rangeEnd);
      const nextDate = new Date(last);
      nextDate.setDate(nextDate.getDate() + 1);
      const iso = formatDateKey(nextDate);
      week.push({
        date: nextDate,
        iso,
        count: 0,
        isFuture: nextDate.getTime() > displayEnd.getTime(),
        isPadding: true,
      });
    }
    weeks.push(week);
  }

  return { weeks, monthMarkers, totalWeeks: weeks.length };
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCellClassName(day: DayCell) {
  if (day.isPadding) {
    return "bg-transparent border-transparent opacity-0";
  }
  if (day.isFuture) {
    return "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700";
  }
  if (day.count === 0) {
    return "bg-zinc-200/70 dark:bg-zinc-800 border-zinc-300/70 dark:border-zinc-700/60";
  }
  if (day.count === 1) {
    return "bg-emerald-200/80 border-emerald-200/80 dark:bg-emerald-950/70 dark:border-emerald-900";
  }
  if (day.count === 2) {
    return "bg-emerald-300/80 border-emerald-300/80 dark:bg-emerald-900/70 dark:border-emerald-800";
  }
  if (day.count === 3) {
    return "bg-emerald-400/80 border-emerald-400/80 dark:bg-emerald-800/70 dark:border-emerald-700";
  }
  return "bg-emerald-500/90 border-emerald-500/90 dark:bg-emerald-700 dark:border-emerald-600";
}

function DayLabels() {
  const labels = ["一", "三", "五"];
  return (
    <div
      className="flex flex-col justify-between py-[2px] text-[10px] leading-3 text-zinc-400 dark:text-zinc-500"
      style={{ width: `${DAY_LABEL_COLUMN_WIDTH}px` }}
    >
      {Array.from({ length: DAYS_IN_WEEK }).map((_, index) => (
        <span key={index} className="h-3">
          {labels.includes(labelForIndex(index)) ? labelForIndex(index) : ""}
        </span>
      ))}
    </div>
  );
}

function labelForIndex(index: number) {
  const mapping = ["一", "二", "三", "四", "五", "六", "日"];
  return mapping[index];
}

function MonthLabels({ markers, weekCount }: { markers: MonthMarker[]; weekCount: number }) {
  if (markers.length === 0) {
    return null;
  }

  const maxLeft = weekCount * CELL_WITH_GAP;

  return (
    <div className="flex items-center gap-2">
      <div aria-hidden="true" style={{ width: `${DAY_LABEL_COLUMN_WIDTH}px` }} />
      <div
        className="relative h-4 text-[10px] font-medium text-zinc-400 dark:text-zinc-500"
        style={{ width: `${weekCount * CELL_WITH_GAP}px` }}
      >
        {markers.map((marker) => {
          const rawLeft = marker.columnIndex * CELL_WITH_GAP + CELL_WITH_GAP / 2;
          const clampedLeft = Math.min(Math.max(rawLeft, CELL_WITH_GAP / 2), maxLeft);

          return (
            <span
              key={`${marker.label}-${marker.columnIndex}`}
              className="absolute whitespace-nowrap px-1.5 text-center transform -translate-x-1/2"
              style={{ left: clampedLeft }}
            >
              {marker.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function HeatmapLegend() {
  const scale = [0, 1, 2, 3, 4];
  return (
    <div className="flex items-center justify-end gap-2 text-xs text-zinc-400 dark:text-zinc-500">
      <span>少</span>
      <div className="flex gap-[2px]">
        {scale.map((level) => (
          <div
            key={level}
            className={`h-3 w-3 rounded-sm border border-transparent ${getCellClassName({
              count: level,
              date: new Date(),
              iso: "",
              isFuture: false,
              isPadding: false,
            })}`}
          />
        ))}
      </div>
      <span>多</span>
    </div>
  );
}
