import {
  Camera,
  Check,
  Clock,
  Copy as CopyIcon,
  Heart,
  ImagePlus,
  Link2,
  LogOut,
  MessageCircle,
  Pencil,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  User,
  UserCircle,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

/**
 * Standard icon set used across the action buttons. Centralised so that:
 *
 * 1. All buttons share a consistent stroke width / size.
 * 2. Toggling fill (e.g. liked ↔ unliked) is handled in one place.
 * 3. Subbing in a different icon set later means changing one file.
 *
 * Default size: 16px (Tailwind `size-4`). Stroke width 2 (lucide default).
 * Bump to 18px (`size-[18px]`) on the detail page's larger pills.
 */

const baseProps = {
  strokeWidth: 2,
  "aria-hidden": true,
} as const;

export const IconLike = ({
  filled,
  ...rest
}: { filled?: boolean } & LucideProps) => (
  <Heart
    {...baseProps}
    {...rest}
    fill={filled ? "currentColor" : "none"}
  />
);

export const IconFavorite = ({
  filled,
  ...rest
}: { filled?: boolean } & LucideProps) => (
  <Star
    {...baseProps}
    {...rest}
    fill={filled ? "currentColor" : "none"}
  />
);

export const IconShare = (props: LucideProps) => <Share2 {...baseProps} {...props} />;

export const IconComment = (props: LucideProps) => (
  <MessageCircle {...baseProps} {...props} />
);

export const IconCopy = (props: LucideProps) => <CopyIcon {...baseProps} {...props} />;

export const IconCheck = (props: LucideProps) => <Check {...baseProps} {...props} />;

export const IconRetry = (props: LucideProps) => (
  <RefreshCw {...baseProps} {...props} />
);

export const IconSearch = (props: LucideProps) => <Search {...baseProps} {...props} />;

export const IconSparkles = (props: LucideProps) => (
  <Sparkles {...baseProps} {...props} />
);

export const IconClock = (props: LucideProps) => <Clock {...baseProps} {...props} />;

export const IconLink = (props: LucideProps) => <Link2 {...baseProps} {...props} />;

export const IconUser = (props: LucideProps) => <UserCircle {...baseProps} {...props} />;

export const IconUserSolid = (props: LucideProps) => <User {...baseProps} {...props} />;

export const IconLogout = (props: LucideProps) => <LogOut {...baseProps} {...props} />;

export const IconSliders = (props: LucideProps) => (
  <SlidersHorizontal {...baseProps} {...props} />
);

export const IconImagePlus = (props: LucideProps) => (
  <ImagePlus {...baseProps} {...props} />
);

export const IconCamera = (props: LucideProps) => <Camera {...baseProps} {...props} />;

export const IconPencil = (props: LucideProps) => <Pencil {...baseProps} {...props} />;