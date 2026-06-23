export const DAILY_GENERATION_LIMIT = 30;
export const SESSION_COOKIE_NAME = "drawspark_session";

// Display order is high-volume → low-volume (see drawing-related keyword research).
// `other` is always last so users see real categories first.
export const SUBJECTS = [
  "animal",
  "people",
  "holiday",
  "nature",
  "everyday",
  "fantasy",
  "flower",
  "dragon",
  "tattoo",
  "anime",
  "abstract",
  "landscape",
  "architecture",
  "still_life",
  "food",
  "car",
  "other",
] as const;

export const STYLES = [
  "cute",
  "cool",
  "sketch",
  "simple",
  "aesthetic",
  "kawaii",
  "cartoon",
  "dark",
  "doodle",
  "minimalist",
  "realistic",
  "abstract",
  "vintage",
  "graffiti",
  "trippy",
  "other",
] as const;

export const DIFFICULTIES = ["easy", "beginner", "medium", "hard"] as const;
export const MOODS = [
  "happy",
  "dreamy",
  "calm",
  "energetic",
  "romantic",
  "mysterious",
  "dark",
  "sad",
  "other",
] as const;
export const SCENES = [
  "bored",
  "daily",
  "class",
  "sketchbook",
  "fall",
  "summer",
  "winter",
  "spring",
  "holiday",
  "gift",
  "other",
] as const;
export const TIME_ESTIMATES = [
  "5min",
  "15min",
  "30min",
  "1hour",
  "2hour_plus",
] as const;
export const AUDIENCES = [
  "kids",
  "beginners",
  "self",
  "couples",
  "boyfriend",
  "girlfriend",
  "best_friend",
  "mom",
  "dad",
  "teacher",
  "other",
] as const;

export const SORT_OPTIONS = ["latest", "likes", "copies", "favorites"] as const;