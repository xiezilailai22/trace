"use client";

import { CHECK_IN_STORAGE_KEY, type CheckInEntry } from "@/types/check-in";

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
