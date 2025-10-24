export interface CheckInEntry {
  id: string;
  createdAt: string;
  note?: string;
  imageData: string;
}

export const CHECK_IN_STORAGE_KEY = "trace-checkins";
