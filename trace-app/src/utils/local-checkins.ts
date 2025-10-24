"use client";

import {
  CHECK_IN_STORAGE_KEY,
  type CheckInEntry,
  type StreakStats,
} from "@/types/check-in";

export function loadCheckIns(): CheckInEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHECK_IN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CheckInEntry[];
    return parsed;
  } catch (error) {
    console.error("Failed to parse check-in data", error);
    return [];
  }
}

export function saveCheckIns(entries: CheckInEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CHECK_IN_STORAGE_KEY,
      JSON.stringify(entries),
    );
  } catch (error) {
    console.error("Failed to save check-in data", error);
  }
}

export function addCheckIn(entry: CheckInEntry) {
  const current = loadCheckIns();
  current.unshift(entry);
  saveCheckIns(current);
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
