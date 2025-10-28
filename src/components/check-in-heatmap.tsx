import { useMemo, useState } from "react";

import type { DailySummary } from "@/types/check-in";

const DAYS_IN_WEEK = 7;

interface DayCell {
  date: Date;
  iso: string;
  count: number;
  isFuture: boolean;
}

interface MonthMarker {
  label: string;
  columnIndex: number;
}

interface CheckInHeatmapProps {
  summaries: DailySummary[];
}

export default function CheckInHeatmap({ summaries }: CheckInHeatmapProps) {
  const availableYears = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return [currentYear, currentYear - 1];
  }, []);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);

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

  const currentYearSummaries = useMemo(() => {
    return summariesByYear.get(selectedYear) ?? [];
  }, [selectedYear, summariesByYear]);

  const yearCellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const summary of currentYearSummaries) {
      map.set(summary.date, summary.count);
    }
    return map;
  }, [currentYearSummaries]);

  const { weeks, monthMarkers } = useMemo(() => {
    return buildYearGrid(yearCellMap, selectedYear);
  }, [selectedYear, yearCellMap]);

  const yearTotals = useMemo(() => {
    const totals = new Map<number, { activeDays: number; totalCount: number }>();
    for (const [year, yearSummaries] of summariesByYear.entries()) {
      let activeDays = 0;
      let totalCount = 0;
      for (const summary of yearSummaries) {
        if (summary.count > 0) {
          activeDays += 1;
        }
        totalCount += summary.count;
      }
      totals.set(year, { activeDays, totalCount });
    }
    return totals;
  }, [summariesByYear]);

  const selectedYearStats = yearTotals.get(selectedYear) ?? {
    activeDays: 0,
    totalCount: 0,
  };

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/60 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
        <span className="text-base font-medium text-zinc-700 dark:text-zinc-200">
          打卡热力图
        </span>
        <p>
          暂无打卡数据。完成第一次打卡后，将自动生成近两年的坚持情况，可直观查看练习频率。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-700 dark:bg-zinc-900/60">
      <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,3fr)_minmax(220px,1fr)] md:items-start md:gap-6">
        <div className="flex flex-col gap-4 md:min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                打卡热力图
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {selectedYear} 年的打卡频率，颜色越深代表当日打卡次数越多
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-x-auto md:max-w-full">
            <div className="min-w-fit">
              <MonthLabels markers={monthMarkers} weekCount={weeks.length} />
            </div>
            <div className="flex gap-2 min-w-fit">
              <DayLabels />
              <div className="flex gap-[2px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[2px]">
                    {week.map((day) => (
                      <div
                        key={day.iso}
                        className={`h-3 w-3 rounded-sm border border-transparent ${getCellClassName(day)}`}
                        title={`${day.iso} · ${day.count} 次打卡`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <HeatmapLegend />
        </div>

        <aside className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/70 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300 md:min-w-[220px] md:max-w-xs">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            年份切换
          </span>
          <div className="flex gap-2">
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 ${
                  year === selectedYear
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-transparent text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          <div className="grid gap-3 rounded-xl border border-dashed border-zinc-200 p-3 text-xs dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">活跃天数</span>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {selectedYearStats.activeDays}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">累计打卡</span>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {selectedYearStats.totalCount}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function buildYearGrid(
  cellMap: Map<string, number>,
  year: number,
): { weeks: DayCell[][]; monthMarkers: MonthMarker[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rangeStart = startOfWeek(new Date(year, 0, 1));
  const lastDayOfYear = new Date(year, 11, 31);
  lastDayOfYear.setHours(0, 0, 0, 0);
  const rangeEnd = startOfWeek(lastDayOfYear);
  rangeEnd.setDate(rangeEnd.getDate() + (DAYS_IN_WEEK - 1));

  const weeks: DayCell[][] = [];
  const monthMarkers: MonthMarker[] = [];
  let current = new Date(rangeStart);
  let week: DayCell[] = [];
  let previousMonth = -1;

  while (current <= rangeEnd) {
    const iso = current.toISOString().slice(0, 10);
    const count = cellMap.get(iso) ?? 0;
    const isFuture =
      year === today.getFullYear() && current.getTime() > today.getTime();

    if (week.length === 0) {
      const month = current.getMonth();
      const isFirstWeekOfMonth =
        month !== previousMonth && (current.getDate() <= 7 || weeks.length === 0);
      if (isFirstWeekOfMonth) {
        monthMarkers.push({
          label: `${month + 1}月`,
          columnIndex: weeks.length,
        });
        previousMonth = month;
      }
    }

    week.push({
      date: new Date(current),
      iso,
      count,
      isFuture,
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
      const iso = nextDate.toISOString().slice(0, 10);
      week.push({
        date: nextDate,
        iso,
        count: 0,
        isFuture:
          year === today.getFullYear() && nextDate.getTime() > today.getTime(),
      });
    }
    weeks.push(week);
  }

  return { weeks, monthMarkers };
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function getCellClassName(day: DayCell) {
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
    <div className="flex flex-col justify-between py-[2px] text-[10px] leading-3 text-zinc-400 dark:text-zinc-500">
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

function MonthLabels({
  markers,
  weekCount,
}: {
  markers: MonthMarker[];
  weekCount: number;
}) {
  if (markers.length === 0) {
    return null;
  }

  return (
    <div className="ml-6 flex gap-[2px] text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
      {Array.from({ length: weekCount }).map((_, index) => {
        const marker = markers.find((item) => item.columnIndex === index);
        return (
          <span key={index} className="flex w-3 items-center justify-center">
            {marker ? marker.label : ""}
          </span>
        );
      })}
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
            })}`}
          />
        ))}
      </div>
      <span>多</span>
    </div>
  );
}
