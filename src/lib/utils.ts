import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compact ID for use in URLs — plain digits, no spaces.
 * Display with formatMeetingId(), route with this. Spaces in route params
 * get percent-encoded and break lookups, so URLs must always be compact.
 */
export function urlMeetingId(raw: string): string {
  return compactMeetingId(raw ?? "");
}

/** Format meeting ID string as "XXX XXX XXXX". */
export function formatMeetingId(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }
  return raw;
}

/** Compact meeting ID — strips all spaces and hyphens. */
export function compactMeetingId(id: string): string {
  return id.replace(/[\s-]/g, "");
}

/**
 * Accept a raw Meeting ID *or* a full invite link and return compact digits.
 * Handles: "312 748 5920", "3127485920", "312-748-5920",
 * "http://host/join/3127485920", "...?meetingId=3127485920".
 * Returns null when nothing parseable is found.
 */
export function extractMeetingCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Full URL? Try meetingId query param, then /join/<digits> path.
  try {
    if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/join/")) {
      const url = new URL(
        /^https?:\/\//i.test(trimmed) ? trimmed : `http://x/${trimmed.replace(/^\//, "")}`
      );
      const qp = url.searchParams.get("meetingId");
      if (qp && /^\d{9,11}$/.test(qp.replace(/[\s-]/g, ""))) {
        return qp.replace(/[\s-]/g, "");
      }
      const m = url.pathname.match(/\/join\/(\d{9,11})/);
      if (m) return m[1];
    }
  } catch {
    // fall through to digit parsing
  }
  const digits = trimmed.replace(/[\s-]/g, "");
  return /^\d{9,11}$/.test(digits) ? digits : null;
}

/** True when the string is a plausible Zoom-style meeting code. */
export function isValidMeetingCode(input: string): boolean {
  return extractMeetingCode(input) !== null;
}

/** Non-blank display name check (mirrors backend min_length=1). */
export function isValidDisplayName(name: string): boolean {
  return name.trim().length > 0;
}

/** True when the given date+time is in the future (1-min grace). */
export function isFutureDateTime(date: string, time: string): boolean {
  if (!date || !time) return false;
  const dt = new Date(`${date}T${time}`);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.getTime() > Date.now() - 60_000;
}

/** Format seconds as MM:SS. */
export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Pick a deterministic avatar colour from a display name. */
const AVATAR_COLORS = [
  "#C0392B", "#0B5CFF", "#16A34A", "#D97706",
  "#7C3AED", "#DB2777", "#0891B2", "#65A30D",
];
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Initials from a display name (max 2 chars). */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}
