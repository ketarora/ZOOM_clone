/**
 * Type-safe API client for the ZoomConnect FastAPI backend.
 *
 * All wire types use camelCase to match the Pydantic alias_generator on the
 * server side.  The base URL is read from NEXT_PUBLIC_API_URL at build time
 * and falls back to the Next.js rewrite proxy at /api so the app works in
 * development without any CORS configuration.
 */

const API_BASE =
  typeof window !== "undefined"
    ? "/api"
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api";

// ── Types ──────────────────────────────────────────────────────────────────

export type MeetingType   = "instant" | "scheduled";
export type MeetingStatus = "waiting" | "active" | "ended";
export type MeetingFilter = "upcoming" | "recent" | "all";

export interface Meeting {
  id: number;
  meetingId: string;
  title: string;
  description?: string | null;
  hostName: string;
  hostEmail: string;
  type: MeetingType;
  status: MeetingStatus;
  scheduledAt?: string | null;
  durationMinutes: number;
  participantCount: number;
  inviteLink: string;
  passcode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingCreate {
  title: string;
  description?: string;
  type: MeetingType;
  scheduledAt?: string;
  durationMinutes?: number;
  passcode?: string;
}

export interface MeetingUpdate {
  title?: string;
  description?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  passcode?: string;
  status?: MeetingStatus;
}

export interface Participant {
  id: number;
  meetingId: number;
  userId?: number | null;
  displayName: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isAdmitted: boolean;
  isHost: boolean;
  joinedAt: string;
  leftAt?: string | null;
}

export interface User {
  id: number;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Error thrown by the API client — carries the HTTP status. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isGone() {
    return this.status === 410;
  }
}

export interface DashboardSummary {
  totalMeetings: number;
  upcomingCount: number;
  recentCount: number;
  activeMeetings: Meeting[];
  upcomingMeetings: Meeting[];
  recentMeetings: Meeting[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

// ── Core fetcher ───────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = await res.json();
      const raw = body.error ?? body.detail ?? message;
      message = typeof raw === "string" ? raw : JSON.stringify(raw);
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export const getDashboardSummary = (): Promise<DashboardSummary> =>
  request("/dashboard/summary");

// ── Current user ───────────────────────────────────────────────────────────

export const getMe = (): Promise<User> => request("/me");

// ── Meetings ───────────────────────────────────────────────────────────────

/**
 * The backend returns a plain JSON array (with pagination metadata in
 * X-Total-Count / X-Page headers). Returns the array directly — callers
 * should not expect a {items} envelope.
 */
export const listMeetings = (
  filter: MeetingFilter = "all",
  page = 1,
  pageSize = 20
): Promise<Meeting[]> =>
  request(`/meetings?type=${filter}&page=${page}&page_size=${pageSize}`);

export const getMeeting = (id: string): Promise<Meeting> =>
  request(`/meetings/${encodeURIComponent(id)}`);

export const createMeeting = (data: MeetingCreate): Promise<Meeting> =>
  request("/meetings", { method: "POST", body: JSON.stringify(data) });

/** Spec aliases — instant and scheduled creation. */
export const createInstantMeeting = (data: MeetingCreate): Promise<Meeting> =>
  request("/meetings/instant", { method: "POST", body: JSON.stringify(data) });

export const createScheduledMeeting = (data: MeetingCreate): Promise<Meeting> =>
  request("/meetings/schedule", { method: "POST", body: JSON.stringify(data) });

export const updateMeeting = (id: string, data: MeetingUpdate): Promise<Meeting> =>
  request(`/meetings/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteMeeting = (id: string): Promise<void> =>
  request(`/meetings/${encodeURIComponent(id)}`, { method: "DELETE" });

/**
 * Join returns the updated Meeting (backend records a Participant row and
 * flips waiting → active). Uses the spec-order route.
 */
export const joinMeeting = (id: string, displayName: string): Promise<Meeting> =>
  request(`/meetings/${encodeURIComponent(id)}/join`, {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });

export const leaveMeeting = (
  id: string,
  opts: { participantId?: number; displayName?: string } = {}
): Promise<Meeting> =>
  request(`/meetings/${encodeURIComponent(id)}/leave`, {
    method: "POST",
    body: JSON.stringify(opts),
  });

export const endMeeting = (id: string): Promise<Meeting> =>
  request(`/meetings/${encodeURIComponent(id)}/end`, { method: "POST" });

export const getMeetingParticipants = (id: string): Promise<Participant[]> =>
  request(`/meetings/${encodeURIComponent(id)}/participants`);

/** Bonus — host controls. */
export const muteAll = (id: string): Promise<Meeting> =>
  request(`/meetings/${encodeURIComponent(id)}/mute-all`, { method: "POST" });

export const removeParticipant = (id: string, participantId: number): Promise<void> =>
  request(`/meetings/${encodeURIComponent(id)}/participants/${participantId}`, {
    method: "DELETE",
  });

export const admitParticipant = (
  id: string,
  participantId: number
): Promise<Participant> =>
  request(
    `/meetings/${encodeURIComponent(id)}/participants/${participantId}/admit`,
    { method: "POST" }
  );

// ── Query key factories (for React Query cache invalidation) ───────────────

export const queryKeys = {
  me: ["me"] as const,
  dashboardSummary: ["dashboard", "summary"] as const,
  meetings: (filter?: MeetingFilter) => ["meetings", filter ?? "all"] as const,
  meeting: (id: string) => ["meeting", id] as const,
  participants: (id: string) => ["participants", id] as const,
};
