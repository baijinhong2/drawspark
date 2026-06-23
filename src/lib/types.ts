import type {
  Audience,
  Difficulty,
  Mood,
  Scene,
  Style,
  Subject,
  TimeEstimate,
} from "@/generated/prisma/client";

export interface GeneratedInspiration {
  title: string;
  description: string;
  subject: string;
  style: string;
  difficulty: string;
  mood: string;
  scene: string;
  time_estimate: string;
  audience: string;
  tags: string[];
}

export interface InspirationResponse {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  style: string;
  difficulty: string;
  mood: string;
  scene: string;
  time_estimate: string;
  audience: string;
  tags: string[];
  likes_count: number;
  copies_count: number;
  shares_count: number;
  favorites_count: number;
  comments_count: number;
  favorited: boolean;
  created_at: string;
}

export type PrismaEnums = {
  subject: Subject;
  style: Style;
  difficulty: Difficulty;
  mood: Mood;
  scene: Scene;
  timeEstimate: TimeEstimate;
  audience: Audience;
};

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}