"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import {
  addCheckIn,
  calculateStreakStats,
  groupCheckInsByDate,
  loadCheckIns,
  subscribeCheckIns,
} from "@/utils/local-checkins";
import type { CheckInEntry, DailySummary, StreakStats } from "@/types/check-in";
import CheckInHeatmap from "@/components/check-in-heatmap";
import CheckInTimeline from "@/components/check-in-timeline";

interface UploadState {
  imageFile?: File;
  imagePreview?: string;
  note: string;
  isSubmitting: boolean;
  error?: string;
  success?: string;
}

const upsertInitialState: UploadState = {
  note: "",
  isSubmitting: false,
};

interface StreakCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

function StreakCard({ label, value, highlight }: StreakCardProps) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border border-zinc-200 p-5 text-center transition dark:border-zinc-700 ${highlight ? "bg-gradient-to-br from-zinc-900 to-zinc-700 text-white dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-900" : "bg-white/80 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300"}`}
    >
      <span className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="text-3xl font-semibold">{value}</span>
    </div>
  );
}

export default function TraceHome() {
  const entries = useSyncExternalStore(
    subscribeCheckIns,
    loadCheckIns,
    () => [],
  );
  const [uploadState, setUploadState] = useState<UploadState>(
    upsertInitialState,
  );

  const stats = useMemo<StreakStats>(
    () => calculateStreakStats(entries),
    [entries],
  );

  const latestEntry = useMemo(() => entries.at(0), [entries]);
  const dailySummaries = useMemo<DailySummary[]>(
    () => groupCheckInsByDate(entries),
    [entries],
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const [file] = event.target.files ?? [];
    if (!file) {
      setUploadState((prev) => ({ ...prev, imageFile: undefined, imagePreview: undefined }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadState((prev) => ({
        ...prev,
        error: "仅支持上传图片文件",
        imageFile: undefined,
        imagePreview: undefined,
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
        error: "图片读取失败，请重试",
        imageFile: undefined,
        imagePreview: undefined,
      }));
    }
  }

  async function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadState.imageFile || !uploadState.imagePreview) {
      setUploadState((prev) => ({
        ...prev,
        error: "请先选择一张图片",
        success: undefined,
      }));
      return;
    }

    setUploadState((prev) => ({ ...prev, isSubmitting: true, error: undefined }));

    try {
      const newEntry: CheckInEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        note: uploadState.note.trim() || undefined,
        imageData: uploadState.imagePreview,
      };

      addCheckIn(newEntry);

      setUploadState({
        note: "",
        isSubmitting: false,
        success: "打卡成功，记得坚持练习！",
        imageFile: undefined,
        imagePreview: undefined,
      });
    } catch (error) {
      console.error("保存打卡失败", error);
      setUploadState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: "打卡保存失败，请稍后再试",
      }));
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white px-6 pb-24 pt-24 dark:from-black dark:via-zinc-900 dark:to-black sm:px-10 lg:px-24">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-16">
        <header className="flex flex-col gap-8 text-center sm:text-left">
          <span className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-zinc-200 px-4 py-1 text-xs uppercase tracking-widest text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:self-start">
            Trace Platform
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            上传每日练习，记录界迹成长
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400 sm:max-w-2xl">
            选择一张今日的练习作品，写下你的心得或学习重点，点击提交即可完成打卡。
            所有内容仅本地可见，帮助你快速搭建个人练习节奏。
          </p>
        </header>

        <section className="grid gap-6 rounded-3xl border border-zinc-200 bg-white/80 p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.4)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white/70 p-6 dark:border-zinc-700 dark:bg-zinc-900/60 md:grid-cols-3">
            <StreakCard label="累计打卡" value={stats.totalCount} highlight />
            <StreakCard label="当前坚持" value={`${stats.currentStreak} 天`} />
            <StreakCard label="最长坚持" value={`${stats.longestStreak} 天`} />
          </div>

          <CheckInHeatmap summaries={dailySummaries} />

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                上传今日图片
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-6 text-center text-sm text-zinc-500 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-zinc-500">
                <span>支持 JPG、PNG、WebP 等常见格式</span>
                <span className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white dark:bg-zinc-100 dark:text-zinc-900">
                  点击或拖拽图片到此处
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {uploadState.imagePreview ? (
                <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
                  <Image
                    src={uploadState.imagePreview}
                    alt="今日打卡预览"
                    width={960}
                    height={720}
                    className="max-h-72 w-full object-cover"
                  />
                </div>
              ) : latestEntry ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
                  上次打卡时间：
                  {new Date(latestEntry.createdAt).toLocaleString()}
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
                name="note"
                rows={4}
                value={uploadState.note}
                onChange={(event) =>
                  setUploadState((prev) => ({
                    ...prev,
                    note: event.target.value,
                    success: undefined,
                  }))
                }
                placeholder="记录今天的练习目标、遇到的难题或收获"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={uploadState.isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {uploadState.isSubmitting ? "打卡处理中..." : "提交今日打卡"}
              </button>
              {uploadState.error && (
                <span className="text-sm text-red-500">{uploadState.error}</span>
              )}
              {uploadState.success && (
                <span className="text-sm text-emerald-500">{uploadState.success}</span>
              )}
            </div>
          </form>
        </section>

        <CheckInTimeline entries={entries} />

        <section className="flex flex-col gap-6 rounded-3xl border border-dashed border-zinc-200 bg-white/40 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50 sm:text-left">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            想集成更多协作功能？
          </h2>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Trace 支持团队共享练习空间、AI 对比分析以及跨平台导出。欢迎联系以获取示例数据或试用权限。
          </p>
          <Link
            href="mailto:hello@trace.ai"
            className="self-center text-sm font-medium text-zinc-900 underline transition hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300 sm:self-start"
          >
            联系我们了解更多 →
          </Link>
        </section>
      </section>
    </main>
  );
}
