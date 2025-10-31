"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";

import CheckInHeatmap from "@/components/check-in-heatmap";
import CheckInTimeline from "@/components/check-in-timeline";
import type { CheckInEntry, DailySummary, StreakStats } from "@/types/check-in";
import {
  addCheckIn,
  calculateStreakStats,
  getCachedCheckIns,
  groupCheckInsByDate,
  loadCheckIns,
  removeCheckIn,
  subscribeCheckIns,
  updateCheckIn,
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

interface AvatarUploadState {
  imageFile?: File;
  imagePreview?: string;
  isSubmitting: boolean;
  error?: string;
}

const avatarUploadInitialState: AvatarUploadState = {
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
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isEntryDetailOpen, setIsEntryDetailOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CheckInEntry | null>(null);
  const [editableNote, setEditableNote] = useState("");
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  const [entryActionError, setEntryActionError] = useState<string | undefined>(undefined);
  const avatarButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [avatarUploadState, setAvatarUploadState] = useState<AvatarUploadState>(avatarUploadInitialState);
  const [avatarSrc, setAvatarSrc] = useState<string>(profile.avatar);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | undefined>(undefined);

  const closeAvatarMenu = useCallback(() => {
    setIsAvatarMenuOpen(false);
  }, []);
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

  const resetAvatarState = useCallback(() => {
    setAvatarUploadState(avatarUploadInitialState);
  }, []);

  const closeAvatarDialog = useCallback(() => {
    setIsAvatarDialogOpen(false);
    resetAvatarState();
  }, [resetAvatarState]);

  const closeLogoutDialog = useCallback(() => {
    setIsLogoutConfirmOpen(false);
    setLogoutError(undefined);
  }, []);

  const closeEntryRelatedDialogs = useCallback(() => {
    setIsEntryDetailOpen(false);
    setIsImagePreviewOpen(false);
    setIsEditingNote(false);
    setIsDeleteConfirmOpen(false);
    setSelectedEntry(null);
    setEntryActionError(undefined);
    setEditableNote("");
    setIsProcessingEntry(false);
  }, []);

  const openEntryDetail = useCallback((entry: CheckInEntry) => {
    setSelectedEntry(entry);
    setEditableNote(entry.note ?? "");
    setEntryActionError(undefined);
    setIsProcessingEntry(false);
    setIsImagePreviewOpen(false);
    setIsEditingNote(false);
    setIsDeleteConfirmOpen(false);
    setIsEntryDetailOpen(true);
  }, []);

  const openImagePreview = useCallback((entry: CheckInEntry) => {
    setSelectedEntry(entry);
    setEntryActionError(undefined);
    setIsProcessingEntry(false);
    setIsEntryDetailOpen(false);
    setIsEditingNote(false);
    setIsDeleteConfirmOpen(false);
    setIsImagePreviewOpen(true);
  }, []);

  const openEditNoteDialog = useCallback((entry: CheckInEntry) => {
    setSelectedEntry(entry);
    setEditableNote(entry.note ?? "");
    setEntryActionError(undefined);
    setIsProcessingEntry(false);
    setIsEntryDetailOpen(false);
    setIsImagePreviewOpen(false);
    setIsDeleteConfirmOpen(false);
    setIsEditingNote(true);
  }, []);

  const openDeleteConfirm = useCallback((entry: CheckInEntry) => {
    setSelectedEntry(entry);
    setEditableNote(entry.note ?? "");
    setEntryActionError(undefined);
    setIsProcessingEntry(false);
    setIsEntryDetailOpen(false);
    setIsImagePreviewOpen(false);
    setIsEditingNote(false);
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleUpdateNote = useCallback(async () => {
    if (!selectedEntry) {
      return;
    }

    const trimmedNote = editableNote.trim();
    setIsProcessingEntry(true);
    setEntryActionError(undefined);
    try {
      await updateCheckIn(selectedEntry.id ?? selectedEntry.createdAt, {
        note: trimmedNote ? trimmedNote : undefined,
      });
      closeEntryRelatedDialogs();
    } catch (error) {
      console.error("更新打卡备注失败", error);
      setEntryActionError("备注更新失败，请稍后重试");
    } finally {
      setIsProcessingEntry(false);
    }
  }, [closeEntryRelatedDialogs, editableNote, selectedEntry]);

  const handleDeleteEntry = useCallback(async () => {
    if (!selectedEntry) {
      return;
    }

    setIsProcessingEntry(true);
    setEntryActionError(undefined);
    try {
      await removeCheckIn(selectedEntry.id ?? selectedEntry.createdAt);
      closeEntryRelatedDialogs();
    } catch (error) {
      console.error("删除打卡记录失败", error);
      setEntryActionError("删除失败，请稍后重试");
    } finally {
      setIsProcessingEntry(false);
    }
  }, [closeEntryRelatedDialogs, selectedEntry]);

  useEffect(() => {
    if (!isAvatarMenuOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (menuRef.current?.contains(event.target) || avatarButtonRef.current?.contains(event.target)) {
        return;
      }

      closeAvatarMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAvatarMenu();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeAvatarMenu, isAvatarMenuOpen]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    setLogoutError(undefined);
    try {
      await new Promise((resolve) => {
        setTimeout(resolve, 600);
      });
      console.log("用户已退出登录");
      closeLogoutDialog();
    } catch (error) {
      console.error("退出登录失败", error);
      setLogoutError("退出失败，请稍后重试");
    } finally {
      setIsLoggingOut(false);
    }
  }, [closeLogoutDialog]);

  async function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const [file] = event.target.files ?? [];

    if (!file) {
      setAvatarUploadState((prev) => ({
        ...prev,
        imageFile: undefined,
        imagePreview: undefined,
        error: undefined,
      }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAvatarUploadState((prev) => ({
        ...prev,
        imageFile: undefined,
        imagePreview: undefined,
        error: "仅支持上传图片文件",
      }));
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setAvatarUploadState((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: preview,
        error: undefined,
      }));
    } catch (error) {
      console.error("读取头像失败", error);
      setAvatarUploadState((prev) => ({
        ...prev,
        imageFile: undefined,
        imagePreview: undefined,
        error: "头像读取失败，请重试",
      }));
    }
  }

  async function handleAvatarSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const preview = avatarUploadState.imagePreview;
    if (!preview) {
      setAvatarUploadState((prev) => ({
        ...prev,
        error: "请先选择新的头像图片",
      }));
      return;
    }

    setAvatarUploadState((prev) => ({
      ...prev,
      isSubmitting: true,
      error: undefined,
    }));

    try {
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
      setAvatarSrc(preview);
      closeAvatarDialog();
    } catch (error) {
      console.error("更新头像失败", error);
      setAvatarUploadState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: "更新头像失败，请稍后重试",
      }));
    }
  }

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
      const newEntry: CheckInEntry = {
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `checkin_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
        imageData: uploadState.imagePreview ?? "",
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
          <div className="flex items-center gap-6">
            <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-500 text-white shadow-md dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500 dark:text-zinc-900">
              <Image src={product.logo} alt="Trace" width={28} height={28} className="h-7 w-7" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                {product.name}
              </span>
              <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                界迹，你的设计成长记录平台
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={openCheckInModal}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-lg transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-400 dark:text-zinc-900 dark:hover:scale-105"
            >
              打卡
            </button>
            <div className="relative">
              <button
                type="button"
                ref={avatarButtonRef}
                aria-haspopup="menu"
                aria-expanded={isAvatarMenuOpen}
                onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-transparent bg-zinc-100 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <Image src={avatarSrc} alt={profile.name} width={40} height={40} className="h-10 w-10 object-cover" />
              </button>
              {isAvatarMenuOpen ? (
                <div
                  ref={menuRef}
                  role="menu"
                  className="absolute right-0 mt-3 w-48 rounded-2xl border border-white/80 bg-white/95 p-2 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900/90"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    onClick={() => {
                      closeAvatarMenu();
                      resetAvatarState();
                      setIsAvatarDialogOpen(true);
                    }}
                  >
                    更换头像
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                    onClick={() => {
                      closeAvatarMenu();
                      setLogoutError(undefined);
                      setIsLogoutConfirmOpen(true);
                    }}
                  >
                    退出登录
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 lg:py-12">
        <section className="flex flex-col gap-10">
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
              <CheckInTimeline
                entries={entries}
                onViewDetail={openEntryDetail}
                onPreviewImage={openImagePreview}
                onEditEntry={openEditNoteDialog}
                onDeleteEntry={openDeleteConfirm}
              />
            ) : (
              <GridCheckIn
                entries={entries}
                onViewDetail={openEntryDetail}
                onPreviewImage={openImagePreview}
                onEditEntry={openEditNoteDialog}
                onDeleteEntry={openDeleteConfirm}
              />
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

      {isAvatarDialogOpen && (
        <AvatarDialog
          avatarState={avatarUploadState}
          onClose={closeAvatarDialog}
          onFileChange={handleAvatarFileChange}
          onSubmit={handleAvatarSubmit}
        />
      )}

      {isLogoutConfirmOpen && (
        <LogoutConfirmDialog
          onCancel={closeLogoutDialog}
          onConfirm={handleLogout}
          isProcessing={isLoggingOut}
          errorMessage={logoutError}
        />
      )}

      {isEntryDetailOpen && selectedEntry && (
        <EntryDetailDialog
          entry={selectedEntry}
          onClose={closeEntryRelatedDialogs}
          onPreviewImage={selectedEntry.imageData ? () => openImagePreview(selectedEntry) : undefined}
          onEdit={() => openEditNoteDialog(selectedEntry)}
          onDelete={() => openDeleteConfirm(selectedEntry)}
          errorMessage={entryActionError}
        />
      )}

      {isImagePreviewOpen && selectedEntry && (
        <ImagePreviewDialog entry={selectedEntry} onClose={closeEntryRelatedDialogs} />
      )}

      {isEditingNote && selectedEntry && (
        <EditNoteDialog
          entry={selectedEntry}
          note={editableNote}
          onChangeNote={setEditableNote}
          onCancel={closeEntryRelatedDialogs}
          onSubmit={handleUpdateNote}
          isProcessing={isProcessingEntry}
          errorMessage={entryActionError}
        />
      )}

      {isDeleteConfirmOpen && selectedEntry && (
        <DeleteCheckInDialog
          entry={selectedEntry}
          onCancel={closeEntryRelatedDialogs}
          onConfirm={handleDeleteEntry}
          isProcessing={isProcessingEntry}
          errorMessage={entryActionError}
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

interface EntryDetailDialogProps {
  entry: CheckInEntry;
  onClose: () => void;
  onPreviewImage?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  errorMessage?: string;
}

function EntryDetailDialog({ entry, onClose, onPreviewImage, onEdit, onDelete, errorMessage }: EntryDetailDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-white/70 bg-white/95 p-8 shadow-2xl transition dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              练习详情
            </span>
            <time className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {new Date(entry.createdAt).toLocaleString()}
            </time>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="关闭详情弹窗"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-4">
            {entry.imageData ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <Image
                  src={entry.imageData}
                  alt={entry.note ? `打卡：${entry.note}` : "打卡图片"}
                  width={1440}
                  height={1080}
                  className="w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-500">
                暂无图片
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {entry.imageData && onPreviewImage ? (
                <button
                  type="button"
                  onClick={onPreviewImage}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  查看大图
                </button>
              ) : null}
              <button
                type="button"
                onClick={onEdit}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                修改备注
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                删除记录
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              心得记录
            </span>
            {entry.note ? (
              <p className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white/80 p-4 text-sm leading-6 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
                {entry.note}
              </p>
            ) : (
              <p className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-500">
                尚未填写心得，点击“修改备注”补充你的思考。
              </p>
            )}
            {errorMessage && (
              <span className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-200">
                {errorMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ImagePreviewDialogProps {
  entry: CheckInEntry;
  onClose: () => void;
}

function ImagePreviewDialog({ entry, onClose }: ImagePreviewDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute left-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="关闭大图预览"
      >
        ✕
      </button>
      <div className="relative flex max-h-[90vh] max-w-5xl items-center justify-center">
        {entry.imageData ? (
          <Image
            src={entry.imageData}
            alt={entry.note ? `打卡：${entry.note}` : "打卡图片"}
            width={1920}
            height={1080}
            className="max-h-[90vh] w-auto rounded-3xl object-contain shadow-2xl"
          />
        ) : (
          <div className="flex h-80 w-full items-center justify-center rounded-3xl bg-zinc-900/60 text-sm text-zinc-200">
            暂无图片可预览
          </div>
        )}
      </div>
    </div>
  );
}

interface EditNoteDialogProps {
  entry: CheckInEntry;
  note: string;
  onChangeNote: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isProcessing: boolean;
  errorMessage?: string;
}

function EditNoteDialog({ entry, note, onChangeNote, onCancel, onSubmit, isProcessing, errorMessage }: EditNoteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/70 bg-white/95 p-8 shadow-2xl transition dark:border-zinc-700 dark:bg-zinc-900/90">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">修改备注</span>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="关闭修改备注弹窗"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {new Date(entry.createdAt).toLocaleString()}
        </p>

        <label className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-200">
          <span>备注内容</span>
          <textarea
            rows={5}
            value={note}
            onChange={(event) => onChangeNote(event.target.value)}
            placeholder="记录你的练习心得或复盘"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
          />
        </label>

        {errorMessage && (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isProcessing}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isProcessing ? "保存中..." : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteCheckInDialogProps {
  entry: CheckInEntry;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  errorMessage?: string;
}

function DeleteCheckInDialog({ entry, onCancel, onConfirm, isProcessing, errorMessage }: DeleteCheckInDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl transition dark:border-zinc-700 dark:bg-zinc-900/90">
        <div className="mb-4">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">删除打卡记录</span>
        </div>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
          确认要删除 {new Date(entry.createdAt).toLocaleString()} 的练习记录吗？此操作不可撤销。
        </p>
        {errorMessage && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-200">
            {errorMessage}
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-600"
          >
            {isProcessing ? "删除中..." : "确认删除"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface GridCheckInProps {
  entries: CheckInEntry[];
  onViewDetail?: (entry: CheckInEntry) => void;
  onPreviewImage?: (entry: CheckInEntry) => void;
  onEditEntry?: (entry: CheckInEntry) => void;
  onDeleteEntry?: (entry: CheckInEntry) => void;
}

function GridCheckIn({ entries, onViewDetail, onPreviewImage, onEditEntry, onDeleteEntry }: GridCheckInProps) {
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
            role={onViewDetail ? "button" : undefined}
            tabIndex={onViewDetail ? 0 : undefined}
            onClick={() => {
              if (onViewDetail) {
                onViewDetail(entry);
              }
            }}
            onKeyDown={(event) => {
              if (!onViewDetail) {
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onViewDetail(entry);
              }
            }}
            className={`flex flex-col gap-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white/80 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900/60 ${onViewDetail ? "cursor-pointer" : ""}`}
          >
            {entry.imageData ? (
              <Image
                src={entry.imageData}
                alt={entry.note ?? "今日打卡"}
                width={640}
                height={480}
                className="h-48 w-full rounded-2xl object-cover"
                onClick={(event) => {
                  event.stopPropagation();
                  if (onPreviewImage) {
                    onPreviewImage(entry);
                  }
                }}
                role={onPreviewImage ? "button" : undefined}
                tabIndex={onPreviewImage ? 0 : undefined}
                onKeyDown={(event) => {
                  if (!onPreviewImage) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onPreviewImage(entry);
                  }
                }}
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

            <div className="mt-auto flex items-center justify-end gap-3 pt-1">
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
interface AvatarDialogProps {
  avatarState: AvatarUploadState;
  onClose: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function AvatarDialog({ avatarState, onClose, onFileChange, onSubmit }: AvatarDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl transition dark:border-zinc-700 dark:bg-zinc-900/90">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">更换头像</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="关闭头像弹窗"
          >
            ✕
          </button>
        </div>

        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-center text-sm text-zinc-500 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-zinc-500">
            <span>支持 JPG、PNG、WebP 等常见格式</span>
            <span className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white dark:bg-zinc-100 dark:text-zinc-900">
              点击或拖拽图片到此处
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </label>

          {avatarState.imagePreview && (
            <div className="w-full">
              <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">预览</span>
              <div className="flex items-center justify-center">
                <Image
                  src={avatarState.imagePreview}
                  alt="新的头像预览"
                  width={120}
                  height={120}
                  className="h-28 w-28 rounded-full object-cover shadow-lg"
                />
              </div>
            </div>
          )}

          {avatarState.error && <span className="text-sm text-red-500">{avatarState.error}</span>}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-700"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={avatarState.isSubmitting}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {avatarState.isSubmitting ? "保存中..." : "保存头像"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface LogoutConfirmDialogProps {
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  errorMessage?: string;
}

function LogoutConfirmDialog({ isProcessing, onCancel, onConfirm, errorMessage }: LogoutConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl transition dark:border-zinc-700 dark:bg-zinc-900/90">
        <div className="mb-4">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">退出登录</span>
        </div>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-300">确定要退出登录吗？当前未保存的数据将丢失。</p>
        {errorMessage && <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-200">{errorMessage}</div>}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-700"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-600"
          >
            {isProcessing ? "退出中..." : "确认退出"}
          </button>
        </div>
      </div>
    </div>
  );
}
