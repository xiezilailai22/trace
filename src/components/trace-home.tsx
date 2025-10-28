"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";

import CheckInHeatmap from "@/components/check-in-heatmap";
import CheckInTimeline from "@/components/check-in-timeline";
import type { DailySummary, StreakStats } from "@/types/check-in";
import {
  addCheckIn,
  calculateStreakStats,
  getCachedCheckIns,
  groupCheckInsByDate,
  loadCheckIns,
  subscribeCheckIns,
} from "@/utils/local-checkins";

interface UploadState {
  imageFile?: File;
  imagePreview?: string;
  note: string;
  isSubmitting: boolean;
  error?: string;
  success?: string;
}

const uploadInitialState: UploadState = {
  note: "",
  isSubmitting: false,
};

type LayoutMode = "grid" | "timeline";

const profile = {
  name: "Max Chen",
  title: "创作者 · 产品设计师",
  avatar: "/file.svg",
};

const product = {
  name: "Trace",
  logo: "/globe.svg",
};

const statsConfig: Array<{ key: keyof StreakStats; label: string; formatter?: (value: number) => string }>= [
  { key: "totalCount", label: "累计打卡" },
  { key: "currentStreak", label: "当前坚持", formatter: (value) => `${value} 天` },
  { key: "longestStreak", label: "最长坚持", formatter: (value) => `${value} 天` },
];

export default function TraceHome() {
  const entries = useSyncExternalStore(subscribeCheckIns, loadCheckIns, getCachedCheckIns);
  const [uploadState, setUploadState] = useState<UploadState>(uploadInitialState);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("timeline");

  const stats = useMemo<StreakStats>(() => calculateStreakStats(entries), [entries]);
  const dailySummaries = useMemo<DailySummary[]>(() => groupCheckInsByDate(entries), [entries]);
  const latestEntry = useMemo(() => entries.at(0), [entries]);

  const resetUploadState = () =>
    setUploadState({
      ...uploadInitialState,
      imageFile: undefined,
      imagePreview: undefined,
      success: undefined,
      error: undefined,
    });

  const openCheckInModal = () => {
    resetUploadState();
    setIsDialogOpen(true);
    setIsSuccessVisible(false);
  };

  const closeCheckInModal = () => {
    setIsDialogOpen(false);
    resetUploadState();
    setIsSuccessVisible(false);
  };

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const [file] = event.target.files ?? [];

    if (!file) {
      setUploadState((prev) => ({ ...prev, imageFile: undefined, imagePreview: undefined }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadState((prev) => ({
        ...prev,
        imageFile: undefined,
        imagePreview: undefined,
        error: "仅支持上传图片文件",
      }));
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setUploadState((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: preview,
        error: undefined,
        success: undefined,
      }));
    } catch (error) {
      console.error("预览图片失败", error);
      setUploadState((prev) => ({
        ...prev,
        imageFile: undefined,
        imagePreview: undefined,
        error: "图片读取失败，请重试",
      }));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadState.isSubmitting) {
      return;
    }

    setUploadState((prev) => ({ ...prev, isSubmitting: true, error: undefined }));

    try {
      const newEntry = {
        createdAt: new Date().toISOString(),
        imageData: uploadState.imagePreview,
        note: uploadState.note.trim() || undefined,
      };

      addCheckIn(newEntry);
      setUploadState({
        note: "",
        isSubmitting: false,
        success: "打卡成功，继续加油！",
        imageFile: undefined,
        imagePreview: undefined,
      });
      setIsSuccessVisible(true);
      setTimeout(() => {
        closeCheckInModal();
      }, 800);
    } catch (error) {
      console.error("保存打卡失败", error);
      setUploadState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: "打卡保存失败，请稍后重试",
      }));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-900 dark:to-black">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-500 text-white shadow-md dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500 dark:text-zinc-900">
              <Image src={product.logo} alt="Trace" width={28} height={28} className="h-7 w-7" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                {product.name}
              </span>
              <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                成长记录平台
              </span>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-3 rounded-full border border-transparent bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            onClick={() => console.log("logout")}
          >
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full">
              <Image src={profile.avatar} alt={profile.name} width={36} height={36} className="h-9 w-9 object-cover" />
            </span>
            <span>退出登录</span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 lg:flex-row lg:py-12">
        <aside className="flex w-full max-w-sm flex-col gap-6 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_30px_60px_-45px_rgba(15,23,42,0.4)] backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-900/60">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-zinc-100 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
              <Image src={profile.avatar} alt={profile.name} width={120} height={120} className="h-28 w-28 object-cover" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {profile.name}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{profile.title}</span>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
            {statsConfig.map(({ key, label, formatter }) => (
              <div key={key} className="flex flex-col gap-1 rounded-xl bg-white/70 p-3 shadow-sm dark:bg-zinc-900/60">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {label}
                </span>
                <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatter ? formatter(stats[key]) : stats[key]}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={openCheckInModal}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-lg transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-400 dark:text-zinc-900 dark:hover:scale-105"
          >
            打卡
          </button>
        </aside>

        <section className="flex flex-1 flex-col gap-10">
          <div className="grid gap-6 rounded-3xl border border-white/70 bg-white/85 p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.4)] backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-900/65">
            <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-700 dark:bg-zinc-900/60 lg:grid-cols-3">
              {statsConfig.map(({ key, label, formatter }) => (
                <div key={key} className="flex flex-col gap-2 rounded-2xl bg-white/70 p-4 shadow-sm dark:bg-zinc-900/60">
                  <span className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    {label}
                  </span>
                  <span className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatter ? formatter(stats[key]) : stats[key]}
                  </span>
                </div>
              ))}
            </div>

            <CheckInHeatmap summaries={dailySummaries} />
          </div>

          <section className="flex flex-col gap-6 rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_30px_60px_-45px_rgba(15,23,42,0.35)] backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-900/65">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  打卡列表
                </span>
                <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  我的练习记录
                </span>
              </div>
              <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-400">
                <button
                  type="button"
                  onClick={() => setLayoutMode("timeline")}
                  className={`rounded-full px-4 py-2 font-medium transition ${layoutMode === "timeline" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                >
                  时间线
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("grid")}
                  className={`rounded-full px-4 py-2 font-medium transition ${layoutMode === "grid" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                >
                  宫格
                </button>
              </div>
            </header>

            {layoutMode === "timeline" ? (
              <CheckInTimeline entries={entries} />
            ) : (
              <GridCheckIn entries={entries} />
            )}
          </section>
        </section>
      </main>

      {isDialogOpen && (
        <CheckInModal
          uploadState={uploadState}
          latestEntryDate={latestEntry ? new Date(latestEntry.createdAt).toLocaleString() : undefined}
          onClose={closeCheckInModal}
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          onNoteChange={(note) =>
            setUploadState((prev) => ({ ...prev, note, success: undefined }))
          }
          isSuccessVisible={isSuccessVisible}
        />
      )}
    </div>
  );
}

interface CheckInModalProps {
  uploadState: UploadState;
  latestEntryDate?: string;
  onClose: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onNoteChange: (note: string) => void;
  isSuccessVisible: boolean;
}

function CheckInModal({
  uploadState,
  latestEntryDate,
  onClose,
  onFileChange,
  onSubmit,
  onNoteChange,
  isSuccessVisible,
}: CheckInModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-xl rounded-3xl border border-white/70 bg-white/95 p-8 shadow-2xl transition dark:border-zinc-700 dark:bg-zinc-900/90"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              今日打卡
            </span>
            <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              记录你的练习瞬间
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="关闭打卡弹窗"
          >
            ✕
          </button>
        </div>

        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              上传今日图片
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-center text-sm text-zinc-500 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-zinc-500">
              <span>支持 JPG、PNG、WebP 等常见格式</span>
              <span className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white dark:bg-zinc-100 dark:text-zinc-900">
                点击或拖拽图片到此处
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </label>
            {uploadState.imagePreview ? (
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <Image
                  src={uploadState.imagePreview}
                  alt="今日打卡预览"
                  width={960}
                  height={720}
                  className="max-h-64 w-full object-cover"
                />
              </div>
            ) : latestEntryDate ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
                上次打卡时间： {latestEntryDate}
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
                还没有任何打卡记录，试着上传你的第一张练习作品吧。
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              今日心得（选填）
            </label>
            <textarea
              rows={4}
              value={uploadState.note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="记录今天的练习目标、遇到的难题或收获"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={uploadState.isSubmitting}
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {uploadState.isSubmitting ? "打卡处理中..." : "提交今日打卡"}
            </button>
            {uploadState.error && <span className="text-sm text-red-500">{uploadState.error}</span>}
            {isSuccessVisible && uploadState.success && (
              <span className="text-sm text-emerald-500">{uploadState.success}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

interface GridCheckInProps {
  entries: ReturnType<typeof loadCheckIns>;
}

function GridCheckIn({ entries }: GridCheckInProps) {
  const [visibleCount, setVisibleCount] = useState(12);

  const visibleEntries = useMemo(() => entries.slice(0, visibleCount), [entries, visibleCount]);
  const hasMore = visibleCount < entries.length;

  const loadMore = () => {
    setVisibleCount((prev) => prev + 12);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {visibleEntries.map((entry) => (
          <article
            key={entry.id ?? entry.createdAt}
            className="flex flex-col gap-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white/80 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900/60"
          >
            {entry.imageData ? (
              <Image
                src={entry.imageData}
                alt={entry.note ?? "今日打卡"}
                width={640}
                height={480}
                className="h-48 w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-500">
                暂无图片
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
              {entry.note ? (
                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  {entry.note}
                </p>
              ) : (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">今日练习记录未填写备注。</p>
              )}
            </div>
          </article>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          className="self-center rounded-full border border-zinc-200 bg-white px-6 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          加载更多
        </button>
      )}
    </div>
  );
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

