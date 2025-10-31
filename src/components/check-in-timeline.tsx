import type { KeyboardEvent } from "react";

import Image from "next/image";

import type { CheckInEntry } from "@/types/check-in";

interface CheckInTimelineProps {
  entries: CheckInEntry[];
  visibleCount?: number;
  onLoadMore?: () => void;
  onViewDetail?: (entry: CheckInEntry) => void;
  onPreviewImage?: (entry: CheckInEntry) => void;
  onEditEntry?: (entry: CheckInEntry) => void;
  onDeleteEntry?: (entry: CheckInEntry) => void;
}

export default function CheckInTimeline({
  entries,
  visibleCount,
  onLoadMore,
  onViewDetail,
  onPreviewImage,
  onEditEntry,
  onDeleteEntry,
}: CheckInTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-zinc-200 bg-white/80 p-16 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
        暂无打卡记录，试着提交第一条练习吧。
      </div>
    );
  }

  const items = typeof visibleCount === "number" ? entries.slice(0, visibleCount) : entries;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4">
        {items.map((entry) => (
          <article
            key={entry.id ?? entry.createdAt}
            role={onViewDetail ? "button" : undefined}
            tabIndex={onViewDetail ? 0 : undefined}
            onClick={() => {
              if (onViewDetail) {
                onViewDetail(entry);
              }
            }}
            onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
              if (!onViewDetail) {
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onViewDetail(entry);
              }
            }}
            className={`flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/70 ${onViewDetail ? "cursor-pointer" : ""}`}
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

            {entry.imageData ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <Image
                  src={entry.imageData}
                  alt={entry.note ? `打卡：${entry.note}` : "打卡图片"}
                  width={1280}
                  height={960}
                  className="max-h-96 w-full object-cover"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onPreviewImage) {
                      onPreviewImage(entry);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      if (onPreviewImage) {
                        onPreviewImage(entry);
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-500">
                暂无图片
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (onEditEntry) {
                    onEditEntry(entry);
                  }
                }}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                修改备注
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (onDeleteEntry) {
                    onDeleteEntry(entry);
                  }
                }}
                className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                删除记录
              </button>
            </div>
          </article>
        ))}
      </div>

      {typeof visibleCount === "number" && visibleCount < entries.length && onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="self-center rounded-full border border-zinc-200 bg-white px-6 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          加载更多
        </button>
      )}
    </div>
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
