import type { Difficulty, TimeEstimate } from "@/generated/prisma/client";
import {
  AUDIENCES,
  DIFFICULTIES,
  MOODS,
  SCENES,
  STYLES,
  SUBJECTS,
} from "./constants";

const TIME_TO_PRISMA: Record<string, TimeEstimate> = {
  "5min": "min_5",
  "15min": "min_15",
  "30min": "min_30",
  "1hour": "hour_1",
  "2hour_plus": "hour_2_plus",
};

const TIME_FROM_PRISMA: Record<TimeEstimate, string> = {
  min_5: "5min",
  min_15: "15min",
  min_30: "30min",
  hour_1: "1hour",
  hour_2_plus: "2hour_plus",
};

export function toTimeEstimate(value: string): TimeEstimate {
  return TIME_TO_PRISMA[value] ?? "min_15";
}

export function fromTimeEstimate(value: TimeEstimate): string {
  return TIME_FROM_PRISMA[value];
}

export function toDifficulty(value: string): Difficulty {
  return DIFFICULTIES.includes(value as (typeof DIFFICULTIES)[number])
    ? (value as Difficulty)
    : "easy";
}

/** Convert a single value or array to a validated string array for DB storage. */
function toArray<T extends string>(
  value: T | T[],
  validOptions: readonly string[],
): string[] {
  if (Array.isArray(value)) {
    const filtered = value
      .filter((v) => typeof v === "string" && validOptions.includes(v))
      .slice(0, 2);
    return filtered as T[];
  }
  return validOptions.includes(value) ? [value] : ["other"];
}

export function toSubject(value: string | string[]): string[] {
  return toArray(value, SUBJECTS);
}

export function toStyle(value: string | string[]): string[] {
  return toArray(value, STYLES);
}

export function toMood(value: string | string[]): string[] {
  return toArray(value, MOODS);
}

export function toScene(value: string | string[]): string[] {
  return toArray(value, SCENES);
}

export function toAudience(value: string | string[]): string[] {
  return toArray(value, AUDIENCES);
}

export function isValidFilter(
  value: string | null,
  options: readonly string[],
): value is string {
  return !!value && options.includes(value);
}