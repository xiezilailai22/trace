import type { DailySummary } from "@/types/check-in";

const WEEKS_DISPLAYED = 26;
const DAYS_IN_WEEK = 7;

interface DayCell {
  date: Date;
  iso: string;
  count: number;
  isFuture: boolean;
}

interface CheckInHeatmapProps {
  summaries: DailySummary[];
}

export default function CheckInHeatmap({ summaries }: CheckInHeatmapProps) {
  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-zinc-200 bg-white/60 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
        <span className="text-base font-medium text-zinc-700 dark:text-zinc-200">
          打卡热力图
        </span>
        <p>
          暂无打卡数据。完成第一次打卡后，将自动生成最近 26 周的坚持情况，可直观查看练习频率。
        </p>
      </div>
    );
  }

  const cellMap = new Map<string, number>();
  for (const summary of summaries) {
    cellMap.set(summary.date, summary.count);
  }

  const weeks = buildGrid(cellMap);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-700 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            打卡热力图
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            最近 26 周的打卡频率，颜色越深代表当日打卡次数越多
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <DayLabels />
        <div className="flex gap-[2px]">
          {weeks.map((week, index) => (
            <div key={index} className="flex flex-col gap-[2px]">
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

      <HeatmapLegend />
    </div>
  );
}

function buildGrid(cellMap: Map<string, number>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfCurrentWeek = startOfWeek(today);

  const weeks: DayCell[][] = [];
  for (let weekIndex = WEEKS_DISPLAYED - 1; weekIndex >= 0; weekIndex--) {
    const weekStart = new Date(startOfCurrentWeek);
    weekStart.setDate(weekStart.getDate() - weekIndex * DAYS_IN_WEEK);

    const week: DayCell[] = [];
    for (let dayOffset = 0; dayOffset < DAYS_IN_WEEK; dayOffset++) {
      const current = new Date(weekStart);
      current.setDate(current.getDate() + dayOffset);
      const iso = current.toISOString().slice(0, 10);
      const count = cellMap.get(iso) ?? 0;
      const isFuture = current.getTime() > today.getTime();

      week.push({ date: current, iso, count, isFuture });
    }

    weeks.push(week);
  }

  return weeks;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7; // Convert Sunday(0) -> 6
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

function HeatmapLegend() {
  const scale = [0, 1, 2, 3, 4];
  return (
    <div className="flex items-center justify-end gap-2 text-xs text-zinc-400 dark:text-zinc-500">
      <span>少</span>
      <div className="flex gap-[2px]">
        {scale.map((level) => (
          <div
            key={level}
            className={`h-3 w-3 rounded-sm border border-transparent ${getCellClassName({ count: level, date: new Date(), iso: "", isFuture: false })}`}
          />
        ))}
      </div>
      <span>多</span>
    </div>
  );
}
