"use client";

import {
  CHECK_IN_STORAGE_KEY,
  type CheckInEntry,
  type DailySummary,
  type StreakStats,
} from "@/types/check-in";

type CheckInListener = () => void;

const listeners = new Set<CheckInListener>();
let cachedEntries: CheckInEntry[] | undefined;

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeCheckIns(listener: CheckInListener) {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }

  const storageHandler = (event: StorageEvent) => {
    if (event.key === CHECK_IN_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener("storage", storageHandler);
    listeners.delete(listener);
  };
}

export function loadCheckIns(): CheckInEntry[] {
  if (cachedEntries) return cachedEntries;
  if (typeof window === "undefined") {
    cachedEntries = [];
    return cachedEntries;
  }
  try {
    const raw = window.localStorage.getItem(CHECK_IN_STORAGE_KEY);
    if (!raw) {
      cachedEntries = [];
      return cachedEntries;
    }
    const parsed = JSON.parse(raw) as CheckInEntry[];
    cachedEntries = parsed;
    return cachedEntries;
  } catch (error) {
    console.error("Failed to parse check-in data", error);
    cachedEntries = [];
    return cachedEntries;
  }
}

export function saveCheckIns(entries: CheckInEntry[]) {
  if (typeof window === "undefined") return;
  try {
    cachedEntries = entries;
    window.localStorage.setItem(
      CHECK_IN_STORAGE_KEY,
      JSON.stringify(entries),
    );
    notifyListeners();
  } catch (error) {
    console.error("Failed to save check-in data", error);
  }
}

export function addCheckIn(entry: CheckInEntry) {
  const current = loadCheckIns();
  const updated = [entry, ...current];
  saveCheckIns(updated);
}

export function groupCheckInsByDate(entries: CheckInEntry[]): DailySummary[] {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.createdAt.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function calculateStreakStats(entries: CheckInEntry[]): StreakStats {
  if (entries.length === 0) {
    return {
      totalCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastCheckInDate: undefined,
    };
  }

  const uniqueDates = Array.from(
    new Set(entries.map((entry) => entry.createdAt.slice(0, 10))),
  ).sort((a, b) => (a < b ? 1 : -1));

  let currentStreak = 0;
  let longestStreak = 0;
  let previousDate: Date | undefined;

  for (const dateString of uniqueDates) {
    const currentDate = new Date(dateString + "T00:00:00");

    if (!previousDate) {
      currentStreak = 1;
    } else {
      const diff =
        (previousDate.getTime() - currentDate.getTime()) /
        (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    }

    previousDate = currentDate;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  const today = new Date();
  const lastDate = new Date(uniqueDates[0] + "T00:00:00");
  const diffFromToday =
    (today.setHours(0, 0, 0, 0) - lastDate.getTime()) /
    (1000 * 60 * 60 * 24);

  const current = diffFromToday > 1 ? 0 : currentStreak;

  return {
    totalCount: entries.length,
    currentStreak: current,
    longestStreak,
    lastCheckInDate: uniqueDates[0],
  };
}
