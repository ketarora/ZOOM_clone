/**
 * Active-meeting presence — powers the floating mini-window and the
 * "Back to Meeting" home tile (Zoom Web Client parity).
 *
 * The room writes its compact meeting ID here on entry and clears it on
 * End/Leave. Any other page reads it to offer a return path. localStorage
 * keeps it alive across refreshes; nothing is ever sent to the server.
 */

const KEY = "zoom_active_meeting";

export function getActiveMeetingId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveMeetingId(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // private-mode storage — mini-window simply won't appear
  }
}

export function clearActiveMeeting(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
