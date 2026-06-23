import type {
  Audience,
  Difficulty,
  Mood,
  Scene,
  Style,
  Subject,
  TimeEstimate,
} from "@/generated/prisma/client";
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

export function toSubject(value: string): Subject {
  return SUBJECTS.includes(value as (typeof SUBJECTS)[number])
    ? (value as Subject)
    : "other";
}

export function toStyle(value: string): Style {
  return STYLES.includes(value as (typeof STYLES)[number])
    ? (value as Style)
    : "other";
}

export function toDifficulty(value: string): Difficulty {
  return DIFFICULTIES.includes(value as (typeof DIFFICULTIES)[number])
    ? (value as Difficulty)
    : "easy";
}

export function toMood(value: string): Mood {
  return MOODS.includes(value as (typeof MOODS)[number])
    ? (value as Mood)
    : "other";
}

export function toScene(value: string): Scene {
  return SCENES.includes(value as (typeof SCENES)[number])
    ? (value as Scene)
    : "other";
}

export function toAudience(value: string): Audience {
  return AUDIENCES.includes(value as (typeof AUDIENCES)[number])
    ? (value as Audience)
    : "other";
}

export function isValidFilter(
  value: string | null,
  options: readonly string[],
): value is string {
  return !!value && options.includes(value);
}