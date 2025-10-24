import Image from "next/image";

import type { CheckInEntry } from "@/types/check-in";

interface CheckInTimelineProps {
  entries: CheckInEntry[];
}

export default function CheckInTimeline({ entries }: CheckInTimelineProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white/80 p-8 dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            历史打卡记录
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            按时间倒序排列，方便回顾你的成长轨迹。
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/70"
          >
            <div className="flex flex-col gap-1">
              <time className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {formatDateTime(entry.createdAt)}
              </time>
              {entry.note && (
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {entry.note}
                </p>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <Image
                src={entry.imageData}
                alt={entry.note ? `打卡：${entry.note}` : "打卡图片"}
                width={1280}
                height={960}
                className="max-h-96 w-full object-cover"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    console.error("Invalid date format", value, error);
    return value;
  }
}
