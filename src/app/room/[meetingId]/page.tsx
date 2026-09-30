"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type RefCallback,
} from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import {
  useEndMeeting,
  useLeaveMeeting,
  useMeeting,
  useMeetingParticipants,
  useMe,
  useMuteAll,
  useRemoveParticipant,
} from "@/lib/hooks";
import { formatMeetingId, formatElapsed, urlMeetingId } from "@/lib/utils";
import { setActiveMeetingId, clearActiveMeeting, getActiveMeetingId } from "@/lib/activeMeeting";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, MessageCircle, Heart,
  Monitor, MoreHorizontal, ShieldCheck, ChevronUp, X, Send, Maximize2,
  LayoutGrid, Hand, Shield, Settings, Check, Copy, Loader2,
  VolumeX, UserX, Info, Paperclip, Home, Search, Bell, Upload,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  ts: Date;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "🎉", "👏"];

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
}

type Panel = "none" | "participants" | "chat" | "security";

function useVideoRef(stream: MediaStream | null): RefCallback<HTMLVideoElement> {
  return useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && stream) el.srcObject = stream;
    },
    [stream]
  );
}

// Small toggle used inside Host Tools panel
function MiniToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="relative shrink-0">
      <div className={`w-8 h-4 rounded-full transition-colors ${value ? "bg-[#0b6bde]" : "bg-[#444]"}`} />
      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${value ? "left-[calc(100%-14px)]" : "left-0.5"}`} />
    </button>
  );
}

export default function MeetingRoomPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const router = useRouter();
  const pathname = usePathname();

  // ── Core state ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<"joining" | "active" | "ended">("joining");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [giveFeedbackOpt, setGiveFeedbackOpt] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // ── New dropdown / overlay state ────────────────────────────────────────
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  // Anchored popup position: each toolbar popup opens directly above its
  // own button (Zoom parity). Measured from the clicked button's rect.
  const [popupAnchor, setPopupAnchor] = useState<{ key: "react" | "more" | "host"; left: number } | null>(null);

  const POPUP_W = { react: 288, more: 312, host: 330 };

  const openAbove = (key: "react" | "more" | "host", el: HTMLElement | null) => {
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const w = POPUP_W[key];
    setPopupAnchor({
      key,
      left: Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8)),
    });
  };
  const [viewMode, setViewMode] = useState<"speaker" | "gallery" | "multi">("speaker");
  const [captionsOn, setCaptionsOn] = useState(false);
  const [incomingVideoOff, setIncomingVideoOff] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // ── Host Tools (Security) state ──────────────────────────────────────────
  const [lockMeeting, setLockMeeting] = useState(false);
  const [waitingRoomOn, setWaitingRoomOn] = useState(true);
  const [hideProfilePics, setHideProfilePics] = useState(false);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [allowChatPerm, setAllowChatPerm] = useState(true);
  const [allowRename, setAllowRename] = useState(true);
  const [allowUnmuteSelf, setAllowUnmuteSelf] = useState(true);
  const [allowStartVideo, setAllowStartVideo] = useState(true);
  const [allowWhiteboards, setAllowWhiteboards] = useState(true);

  // Route param may carry grouped digits from old links — API calls use compact.
  const apiId = urlMeetingId(meetingId ?? "");
  const { data: meeting, isLoading: meetingLoading, error: meetingError } =
    useMeeting(apiId);
  const { data: me } = useMe();
  const HOST_NAME = meeting?.hostName ?? me?.displayName ?? "You";
  const { data: waitingParticipants = [] } = useMeetingParticipants(apiId, phase === "active");
  const endMeeting = useEndMeeting();
  const leaveMeeting = useLeaveMeeting();
  const muteAll = useMuteAll();
  const removeParticipant = useRemoveParticipant();

  const videoRef = useVideoRef(cameraStream);
  const screenRef = useVideoRef(screenStream);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setPhase("active"), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Register presence ONLY once the backend confirms the meeting is live.
  // (Storing on timer alone created ghost "Back to Meeting" entries for
  // meetings that never validated.)
  useEffect(() => {
    if (phase === "active" && apiId && meeting && meeting.status !== "ended") {
      setActiveMeetingId(apiId);
    }
  }, [phase, apiId, meeting]);

  // Self-heal: landed on a dead/unknown meeting that matches stored
  // presence (e.g. followed a stale Back-to-Meeting link) → clear it so
  // Home goes back to showing "New Meeting".
  useEffect(() => {
    if ((meetingError || meeting?.status === "ended") && getActiveMeetingId() === apiId) {
      clearActiveMeeting();
    }
  }, [meetingError, meeting, apiId]);

  useEffect(() => {
    if (phase !== "active") return;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(setCameraStream)
      .catch(() => setCameraOn(false));
  }, [phase]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream, screenStream]);

  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Media controls ──────────────────────────────────────────────────────
  const toggleMic = () => {
    cameraStream?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  };

  const toggleCamera = () => {
    cameraStream?.getVideoTracks().forEach((t) => (t.enabled = !cameraOn));
    setCameraOn((v) => !v);
  };

  const toggleScreen = async () => {
    if (screenSharing) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setScreenSharing(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(s);
      setScreenSharing(true);
      s.getVideoTracks()[0].addEventListener("ended", () => {
        setScreenStream(null);
        setScreenSharing(false);
      });
    } catch { /* user cancelled */ }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const copyInviteLink = () => {
    const text = meeting?.inviteLink ?? `${window.location.origin}/join?meetingId=${apiId}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleMuteAll = async () => {
    try {
      await muteAll.mutateAsync(apiId);
    } catch {
      // toast-less: button shows pending state; failure is silent but safe
    }
  };

  const handleRemove = async (participantId: number) => {
    try {
      await removeParticipant.mutateAsync({ id: apiId, participantId });
    } catch {
      // silent — list refetches every 5s anyway
    }
  };

  const closeAllMenus = () => {
    setShowMoreMenu(false);
    setShowViewMenu(false);
    setShowInfoPanel(false);
    setShowReactionPicker(false);
  };

  // ── Reactions ────────────────────────────────────────────────────────────
  const fireReaction = (emoji: string) => {
    const id = Math.random().toString(36).slice(2);
    const x = 20 + Math.random() * 60;
    setFloatingReactions((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.id !== id)), 3000);
    setShowReactionPicker(false);
  };

  // ── Chat ─────────────────────────────────────────────────────────────────
  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), sender: HOST_NAME, text, ts: new Date() },
    ]);
    setChatInput("");
  };

  // ── End / leave ────────────────────────────────────────────────────────
  const stopMedia = () => {
    cameraStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
  };

  const handleEnd = async () => {
    clearActiveMeeting();
    try {
      await endMeeting.mutateAsync(apiId);
    } catch {
      // already ended on the server — still exit cleanly
    }
    setShowEndDialog(false);
    stopMedia();
    if (giveFeedbackOpt) {
      setPhase("ended");
      setShowFeedback(true);
    } else {
      router.push("/");
    }
  };

  const handleLeave = async () => {
    clearActiveMeeting();
    try {
      await leaveMeeting.mutateAsync({ id: apiId, displayName: HOST_NAME });
    } catch {
      // leaving a missing meeting still exits cleanly
    }
    setShowEndDialog(false);
    stopMedia();
    if (giveFeedbackOpt) {
      setPhase("ended");
      setShowFeedback(true);
    } else {
      router.push("/");
    }
  };

  // ── Meeting validation gates (spec: never show a blank/broken room) ─────
  if (meetingLoading) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#0B5CFF] mb-5" />
        <p className="text-white text-[16px] font-semibold">Finding your meeting…</p>
        <p className="text-[#888] text-[13px] mt-2 font-mono">{formatMeetingId(meetingId)}</p>
      </div>
    );
  }

  if (meetingError || (!meetingLoading && !meeting)) {
    return (
      <div className="fixed inset-0 bg-[#f7f9fa] flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#ebebeb] shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-[#fff0f0] rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={26} className="text-[#e03e3e]" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-1">Meeting not found</h2>
          <p className="text-[14px] text-[#666] mb-1 font-mono">{formatMeetingId(meetingId)}</p>
          <p className="text-[13px] text-[#888] mb-6">Check the ID or ask the host for a new invite link.</p>
          <button onClick={() => router.push("/join")} className="w-full py-3 bg-[#0B5CFF] text-white font-semibold rounded-xl hover:bg-[#0047cc] transition-colors">
            Try another ID
          </button>
          <button onClick={() => router.push("/")} className="w-full mt-2 py-2 text-[13px] text-[#666] hover:text-[#333] transition-colors">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (meeting?.status === "ended") {
    return (
      <div className="fixed inset-0 bg-[#f7f9fa] flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#ebebeb] shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-[#fff5ee] rounded-full flex items-center justify-center mx-auto mb-4">
            <PhoneOff size={26} className="text-[#fe7521]" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-1">This meeting has ended</h2>
          <p className="text-[14px] text-[#666] mb-1">{meeting.title}</p>
          <p className="text-[13px] text-[#888] mb-6 font-mono">{formatMeetingId(meetingId)}</p>
          <button onClick={() => router.push("/")} className="w-full py-3 bg-[#0B5CFF] text-white font-semibold rounded-xl hover:bg-[#0047cc] transition-colors">
            Back to Home
          </button>
          <button onClick={() => router.push("/meetings")} className="w-full mt-2 py-2 text-[13px] text-[#666] hover:text-[#333] transition-colors">
            View Meetings
          </button>
        </div>
      </div>
    );
  }

  // ── Joining spinner ───────────────────────────────────────────────────────
  if (phase === "joining") {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#3d3d3d] border-t-[#0b6bde] rounded-full animate-spin mb-5" />
        <p className="text-white text-[16px] font-semibold">Joining Meeting…</p>
        <p className="text-[#666] text-[13px] mt-2 font-mono">{formatMeetingId(meetingId)}</p>
      </div>
    );
  }

  // ── Feedback screen ───────────────────────────────────────────────────────
  if (showFeedback) {
    return (
      <div className="fixed inset-0 bg-[#f7f9fa] flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#ebebeb] shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-[#eef5ff] rounded-full flex items-center justify-center mx-auto mb-4">
            <Video size={26} className="text-[#0b6bde]" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-1">Meeting Ended</h2>
          <p className="text-[14px] text-[#666] mb-1">{formatMeetingId(meetingId)}</p>
          <p className="text-[13px] text-[#888] mb-6">Duration: {formatElapsed(elapsed)}</p>
          <p className="text-[14px] font-semibold text-[#1a1a1a] mb-3">How was your meeting?</p>
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setFeedbackRating(n)} className="text-2xl hover:scale-110 transition-transform">
                {n <= feedbackRating ? "⭐" : "☆"}
              </button>
            ))}
          </div>
          <button onClick={() => router.push("/")} className="w-full py-3 bg-[#0b6bde] text-white font-semibold rounded-xl hover:bg-[#0047cc] transition-colors">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Active meeting room ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#161616] flex flex-col overflow-hidden select-none font-sans">

      {/* Close-all overlay when any menu is open */}
      {(showMoreMenu || showViewMenu || showInfoPanel || showReactionPicker || panel === "security") && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            closeAllMenus();
            if (panel === "security") setPanel("none");
          }}
        />
      )}

      {/* Floating reactions */}
      {floatingReactions.map((r) => (
        <div key={r.id} className="fixed bottom-24 text-4xl pointer-events-none z-50 animate-bounce" style={{ left: `${r.x}%` }}>
          {r.emoji}
        </div>
      ))}

      {/* Captions bar */}
      {captionsOn && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-black/80 px-6 py-2 rounded-lg text-white text-[14px] pointer-events-none">
          Live captions enabled — no speech detected
        </div>
      )}

      {/* ── Zoom web chrome (white top strip) ──────────────────────────── */}
      <div className="h-14 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 border-b border-[#ebebeb]">
        <div className="flex items-center gap-5">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 select-none" title="Home">
            <span className="text-[#0B5CFF] font-bold text-[22px] tracking-tight">zoom</span>
            <span className="text-[#1a1a1a] text-[15px] font-medium hidden sm:inline">Workplace</span>
          </button>
          <button onClick={() => router.push("/meetings")} className="hidden md:flex items-center gap-2 bg-[#f0f2f5] hover:bg-[#e4e7ec] transition-colors rounded-lg px-4 py-1.5 text-[13px] text-[#666]">
            <Search size={14} />
            Search
          </button>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden lg:block text-[13px] text-[#444]">Admin Center</span>
          <span className="hidden lg:block text-[13px] text-[#0B5CFF] font-medium">Download</span>
          <span title="Included in this demo" className="hidden sm:block px-3.5 py-1.5 bg-[#0B5CFF] text-white text-[13px] font-semibold rounded-full select-none">Upgrade</span>
          <button onClick={() => router.push("/profile")} className="relative text-[#555] hover:text-[#111] transition-colors" title="Notifications">
            <Bell size={17} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#e03e3e] rounded-full" />
          </button>
          <button onClick={() => router.push("/profile")} className="w-7 h-7 rounded-full bg-[#E05B2B] text-white text-[12px] font-bold flex items-center justify-center" title="Profile">
            {(me?.displayName?.[0] ?? "K").toUpperCase()}
          </button>
        </div>
      </div>

      {/* ── Meeting bar ──────────────────────────────────────────────────── */}
      <div className="h-10 px-4 flex items-center justify-between text-white bg-black/50 backdrop-blur-sm shrink-0 z-30">
        <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-lg max-w-[260px]">
          <Info size={13} className="text-white/70 shrink-0" />
          <span className="text-[12px] font-semibold text-white truncate">
            {meeting?.title ?? "Zoom Meeting"}
          </span>
        </div>

        <div className="flex items-center gap-4 relative">
          {/* Green shield — info panel toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowInfoPanel((v) => !v); setShowViewMenu(false); setShowMoreMenu(false); }}
            className="hover:opacity-80 transition-opacity"
          >
            <ShieldCheck size={16} className="text-[#23d85d]" />
          </button>

          <span title="Zoom" className="text-[10px] font-bold text-white/70 bg-white/10 rounded-full w-6 h-6 flex items-center justify-center select-none">zm</span>

          {/* View dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowViewMenu((v) => !v); setShowInfoPanel(false); setShowMoreMenu(false); }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors ${showViewMenu ? "bg-white/20" : "hover:bg-white/10"}`}
            >
              <LayoutGrid size={15} />
              <span className="text-[12px]">View</span>
            </button>

            {showViewMenu && (
              <div className="absolute top-8 right-0 bg-[#2d2d2d] border border-white/10 rounded-xl shadow-2xl z-50 w-56 py-2" onClick={(e) => e.stopPropagation()}>
                <div className="px-2 pb-2 border-b border-white/10">
                  {[
                    { label: "Speaker View", value: "speaker" },
                    { label: "Gallery View", value: "gallery" },
                    { label: "Multi-speaker View", value: "multi" },
                  ].map((v) => (
                    <button key={v.value} onClick={() => { setViewMode(v.value as typeof viewMode); setShowViewMenu(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-white hover:bg-white/10 rounded-lg transition-colors">
                      <span>{v.label}</span>
                      {viewMode === v.value && <Check size={14} className="text-[#23d85d]" />}
                    </button>
                  ))}
                </div>
                <div className="px-2 py-2 border-b border-white/10">
                  <button className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-[#ccc] hover:bg-white/10 rounded-lg transition-colors">
                    <span>Sort Gallery By</span>
                    <ChevronUp size={12} className="rotate-90" />
                  </button>
                  <button className="w-full px-3 py-2 text-[13px] text-left text-[#ccc] hover:bg-white/10 rounded-lg transition-colors">
                    Follow Host&apos;s Video Order
                  </button>
                </div>
                <div className="px-2 py-2">
                  <button className="w-full px-3 py-2 text-[13px] text-left text-[#ccc] hover:bg-white/10 rounded-lg transition-colors">
                    Hide Self View
                  </button>
                  <button className="w-full px-3 py-2 text-[13px] text-left text-[#ccc] hover:bg-white/10 rounded-lg transition-colors">
                    Hide Non-video Participants
                  </button>
                  <button onClick={() => { toggleFullscreen(); setShowViewMenu(false); }}
                    className="w-full px-3 py-2 text-[13px] text-left text-[#ccc] hover:bg-white/10 rounded-lg transition-colors">
                    Fullscreen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Maximize — functional fullscreen */}
          <button onClick={toggleFullscreen} className="hover:text-[#0b6bde] transition-colors">
            <Maximize2 size={14} />
          </button>

          {/* Encryption panel (Zoom: shield → "Enhanced encryption is on") */}
          {showInfoPanel && (
            <div className="absolute top-10 right-0 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl z-50 w-[340px] p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[14px] font-bold text-white mb-1.5">Enhanced encryption is on</h3>
              <p className="text-[12px] text-[#aaa] leading-relaxed mb-4">
                You are connected to the Zoom Global Network via a data center in India.
              </p>
              <div className="space-y-2.5">
                {[
                  { label: "Meeting ID", value: formatMeetingId(meetingId), mono: true },
                  { label: "Host", value: meeting?.hostName ?? `${HOST_NAME} (You)`, mono: false },
                  ...(meeting?.passcode
                    ? [{ label: "Passcode", value: meeting.passcode, mono: true as const }]
                    : []),
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex gap-4">
                    <span className="text-[12px] text-[#888] w-24 shrink-0">{label}</span>
                    <span className={`text-[12px] text-white ${mono ? "font-mono" : ""}`}>{value}</span>
                  </div>
                ))}
                <div className="flex gap-4">
                  <span className="text-[12px] text-[#888] w-24 shrink-0">Encryption</span>
                  <span className="text-[12px] text-white">Enabled</span>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="text-[12px] text-[#888] w-24 shrink-0">Invite Link</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-[#5b9eff] truncate max-w-[150px]">
                      {meeting?.inviteLink ?? `…/join/${meetingId}`}
                    </span>
                    <button onClick={copyInviteLink} className="shrink-0 text-[#5b9eff] hover:text-white transition-colors">
                      {copiedInvite ? <Check size={12} className="text-[#23d85d]" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 mt-4 pt-3 space-y-2.5">
                <button className="block text-[13px] font-medium text-[#e03e3e] hover:text-[#ff6b60] transition-colors">
                  Report
                </button>
                <button className="block text-[13px] font-medium text-white hover:text-[#aaa] transition-colors">
                  Security settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main viewport ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left icon rail (Zoom web parity — navigating away shows the mini-window) ── */}
        <nav className="hidden sm:flex w-[68px] bg-white flex-col items-center py-3 gap-1 shrink-0 border-r border-[#ebebeb] z-20">
          {[
            { label: "Home", href: "/" as string | null, icon: <Home size={20} /> },
            { label: "Chat", href: null as string | null, icon: <MessageCircle size={20} /> },
            { label: "Meetings", href: "/meetings" as string | null, icon: <Video size={20} /> },
            { label: "Contacts", href: null as string | null, icon: <Users size={20} /> },
          ].map((item) => {
            const isActive =
              item.href !== null &&
              (item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href));
            const inner = (
              <>
                {item.icon}
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </>
            );
            return item.href ? (
              <button
                key={item.label}
                onClick={() => router.push(item.href as string)}
                className={`w-14 py-2 rounded-xl flex flex-col items-center gap-1.5 transition-colors ${
                  isActive ? "text-[#0B5CFF] bg-[#eef5ff]" : "text-[#666] hover:bg-[#f0f2f5]"
                }`}
              >
                {inner}
              </button>
            ) : (
              <div
                key={item.label}
                title="Coming soon"
                className="w-14 py-2 rounded-xl flex flex-col items-center gap-1.5 text-[#bbb] cursor-not-allowed"
              >
                {inner}
              </div>
            );
          })}
          <div className="mt-auto">
            <button
              onClick={() => router.push("/settings")}
              className={`w-14 py-2 rounded-xl flex flex-col items-center gap-1.5 transition-colors ${
                pathname?.startsWith("/settings") ? "text-[#0B5CFF] bg-[#eef5ff]" : "text-[#666] hover:bg-[#f0f2f5]"
              }`}
            >
              <Settings size={20} />
              <span className="text-[10px] font-medium leading-none">Settings</span>
            </button>
          </div>
        </nav>
        {/* Video area */}
        <div className="flex-1 relative bg-[#1c1c1c] flex items-center justify-center">
          {screenSharing && screenStream ? (
            <video ref={screenRef} autoPlay className="max-h-full max-w-full object-contain" />
          ) : cameraOn && cameraStream && !incomingVideoOff ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-white">
              <div className="w-20 h-20 rounded-full bg-[#E05B2B] flex items-center justify-center text-3xl font-bold">K</div>
              <span className="text-[14px] text-[#666] mt-2">{HOST_NAME}</span>
            </div>
          )}

          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
            {micOn ? <Mic size={13} className="text-white" /> : <MicOff size={13} className="text-[#ff3b30]" />}
            <span className="text-[12px] font-medium text-white">{HOST_NAME}</span>
            {handRaised && <span className="text-sm">✋</span>}
          </div>

          <div className="absolute top-4 left-4 bg-black/40 px-3 py-1.5 rounded-lg">
            <span className="text-[11px] text-white/60 font-mono">{formatMeetingId(meetingId)}</span>
          </div>
        </div>

        {/* ── Side panel (participants / chat) ───────────────────────────── */}
        {(panel === "participants" || panel === "chat") && (
          <div className="w-72 bg-[#1e1e1e] border-l border-white/10 flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-[14px] font-semibold text-white">
                {panel === "participants"
                  ? `Participants (${waitingParticipants.length})`
                  : "Meeting Chat"}
              </span>
              <div className="flex items-center gap-2">
                {panel === "chat" && (
                  <button title="Pop out chat" className="text-[#777] hover:text-white transition-colors">
                    <Maximize2 size={14} />
                  </button>
                )}
                <button onClick={() => setPanel("none")} className="text-[#777] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Participants + real host controls */}
              {panel === "participants" && (
                <div className="p-3 space-y-1">
                  <button
                    onClick={handleMuteAll}
                    disabled={muteAll.isPending}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-2 text-[12px] font-semibold text-white bg-white/10 hover:bg-white/15 rounded-lg transition-colors disabled:opacity-60"
                  >
                    <VolumeX size={13} />
                    {muteAll.isPending ? "Muting…" : "Mute All"}
                  </button>
                  {waitingParticipants.map((p) => (
                    <div key={p.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[#E05B2B] flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                        {p.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white truncate">
                          {p.displayName}
                          {p.isHost && (
                            <span className="ml-1.5 text-[10px] text-[#0b6bde] bg-[#0b6bde]/20 px-1.5 py-0.5 rounded-full">Host</span>
                          )}
                        </p>
                        <p className="text-[11px] text-[#666]">
                          {p.isMuted ? "Muted · " : ""}
                          {p.isAdmitted ? "In meeting" : "Waiting"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {p.isMuted ? (
                          <MicOff size={13} className="text-[#ff3b30]" />
                        ) : (
                          <Mic size={13} className="text-[#666]" />
                        )}
                        {!p.isHost && (
                          <button
                            onClick={() => handleRemove(p.id)}
                            title={`Remove ${p.displayName}`}
                            className="p-1 text-[#666] hover:text-[#ff3b30] hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <UserX size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {waitingParticipants.filter((p) => !p.isAdmitted).length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-medium text-[#666] uppercase tracking-wide px-3 mb-1">Waiting Room</p>
                      {waitingParticipants.filter((p) => !p.isAdmitted).map((p) => (
                        <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5">
                          <div className="w-8 h-8 rounded-full bg-[#444] flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                            {p.displayName[0]?.toUpperCase()}
                          </div>
                          <p className="text-[13px] text-[#ccc] flex-1 truncate">{p.displayName}</p>
                          <button
                            onClick={async () => {
                              try {
                                const { admitParticipant } = await import("@/lib/api");
                                await admitParticipant(apiId, p.id);
                              } catch {
                                // list refetches every 5s; failure is non-fatal
                              }
                            }}
                            className="text-[12px] text-[#0b6bde] font-medium hover:underline"
                          >
                            Admit
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chat */}
              {panel === "chat" && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {chatMessages.length === 0 && (
                      <p className="text-center text-[13px] text-[#555] mt-6">No messages yet. Say hello!</p>
                    )}
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#E05B2B] flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">K</div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-[12px] font-semibold text-white">{msg.sender}</span>
                            <span className="text-[10px] text-[#555]">
                              {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-[13px] text-[#ccc] mt-0.5 leading-snug">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Chat composer (Zoom: Everyone pill + formatting row) */}
            {panel === "chat" && (
              <div className="p-3 border-t border-white/10">
                <p className="text-[11px] text-[#777] mb-1.5">Who can see your messages?</p>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[11px] text-[#888]">to:</span>
                  <span className="text-[11px] font-semibold text-white bg-[#0B5CFF] px-2.5 py-0.5 rounded-full">
                    Everyone
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Type message here ..."
                    className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder-[#555]"
                  />
                  <button onClick={sendChat} className="text-[#0b6bde] hover:text-[#5b9eff] transition-colors">
                    <Send size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-2 px-1">
                  <button title="Attach a file" className="text-[#666] hover:text-white transition-colors">
                    <Paperclip size={14} />
                  </button>
                  <button onClick={() => fireReaction("❤️")} title="Send a reaction" className="text-[#666] hover:text-white transition-colors text-[14px] leading-none">
                    ♥
                  </button>
                  <span className="text-[11px] text-[#555]">···</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Floating popups (fixed: escape the scrollable toolbar so they never clip) ── */}
      {showReactionPicker && popupAnchor?.key === "react" && (
        <div className="fixed bottom-[88px] z-50 bg-[#2d2d2d] border border-white/10 rounded-2xl px-4 py-3 flex gap-2.5 shadow-2xl" style={{ left: popupAnchor.left, width: POPUP_W.react }} onClick={(e) => e.stopPropagation()}>
          {REACTIONS.map((emoji) => (
            <button key={emoji} onClick={() => fireReaction(emoji)} className="text-2xl hover:scale-125 transition-transform leading-none">{emoji}</button>
          ))}
        </div>
      )}
      {showMoreMenu && popupAnchor?.key === "more" && (
        <div className="fixed bottom-[88px] z-50 bg-[#2d2d2d] border border-white/10 rounded-xl shadow-2xl" style={{ left: popupAnchor.left, width: POPUP_W.more }} onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-3 gap-1 p-2">
            <button onClick={() => { setCaptionsOn((v) => !v); setShowMoreMenu(false); }}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg hover:bg-white/10 transition-colors">
              <span className="w-7 h-5 border border-[#888] rounded text-[9px] flex items-center justify-center text-[#ccc] font-bold">CC</span>
              <span className="text-[11px] text-[#ddd] text-center leading-tight">{captionsOn ? "Hide Captions" : "Show Captions"}</span>
            </button>
            <button onClick={() => setShowMoreMenu(false)} title="Coming soon"
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg hover:bg-white/10 transition-colors">
              <LayoutGrid size={20} className="text-[#ddd]" />
              <span className="text-[11px] text-[#ddd] text-center leading-tight">Breakout Rooms</span>
            </button>
            <button onClick={() => setShowMoreMenu(false)} title="Coming soon"
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg hover:bg-white/10 transition-colors">
              <Monitor size={20} className="text-[#ddd]" />
              <span className="text-[11px] text-[#ddd] text-center leading-tight">Whiteboards</span>
            </button>
            <button onClick={() => setShowMoreMenu(false)} title="Coming soon"
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg hover:bg-white/10 transition-colors">
              <Settings size={20} className="text-[#ddd]" />
              <span className="text-[11px] text-[#ddd] text-center leading-tight">Settings</span>
            </button>
            <button onClick={() => { setIncomingVideoOff((v) => !v); setShowMoreMenu(false); }}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg hover:bg-white/10 transition-colors col-span-2">
              <VideoOff size={20} className="text-[#ddd]" />
              <span className="text-[11px] text-[#ddd] text-center leading-tight">{incomingVideoOff ? "Start Incoming Video" : "Stop Incoming Video"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10">
            <button
              onClick={() => { setCaptionsOn(false); setIncomingVideoOff(false); setShowMoreMenu(false); }}
              className="text-[12px] text-[#aaa] hover:text-white transition-colors"
            >
              Reset to default
            </button>
            <button onClick={() => setShowMoreMenu(false)} className="text-[12px] font-medium text-[#5b9eff] hover:text-white transition-colors">
              Reset
            </button>
          </div>
        </div>
      )}

      {/* ── Host Tools popup (Zoom: anchored panel above the toolbar) ─────── */}
      {panel === "security" && popupAnchor?.key === "host" && (
        <div className="fixed bottom-[88px] z-50 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl p-4 max-h-[60vh] overflow-y-auto" style={{ left: popupAnchor.left, width: POPUP_W.host }} onClick={(e) => e.stopPropagation()}>
          {[
            { label: "Lock Meeting", value: lockMeeting, setter: setLockMeeting },
            { label: "Enable waiting room", value: waitingRoomOn, setter: setWaitingRoomOn },
            { label: "Hide profile pictures", value: hideProfilePics, setter: setHideProfilePics },
          ].map(({ label, value, setter }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-[13px] text-[#ccc]">{label}</span>
              <MiniToggle value={value} onChange={setter} />
            </div>
          ))}
          <div className="pt-3">
            <p className="text-[12px] font-semibold text-white mb-2">Allow participants to:</p>
            {[
              { label: "Share Screen", value: allowScreenShare, setter: setAllowScreenShare },
              { label: "Chat", value: allowChatPerm, setter: setAllowChatPerm },
              { label: "Rename Themselves", value: allowRename, setter: setAllowRename },
              { label: "Unmute Themselves", value: allowUnmuteSelf, setter: setAllowUnmuteSelf },
              { label: "Start Video", value: allowStartVideo, setter: setAllowStartVideo },
              { label: "Share Whiteboards", value: allowWhiteboards, setter: setAllowWhiteboards },
              { label: "Transcribe in My Notes", value: true, setter: (_: boolean) => {} },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center gap-2.5 py-1 text-[13px] text-[#ccc]">
                <Check size={13} className={value ? "text-white shrink-0" : "text-transparent shrink-0"} />
                <button onClick={() => setter(!value)} className="hover:text-white transition-colors text-left">
                  {label}
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 mt-3 pt-3">
            <button className="w-full text-center text-[13px] text-[#e03e3e] font-medium hover:text-[#ff6b60] transition-colors">
              Suspend Participant Activities
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom control bar (Zoom: translucent dark) ─────────────────────── */}
      <div className="min-h-[72px] bg-black/80 backdrop-blur-md text-white flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-t border-white/10 shrink-0 z-30 relative">
        {/* Left */}
        <div className="flex items-center gap-1 shrink-0">
          <ControlBtn caret icon={micOn ? <Mic size={20} /> : <MicOff size={20} className="text-[#ff3b30]" />} label={micOn ? "Mute" : "Unmute"} onClick={toggleMic} />
          <ControlBtn caret icon={cameraOn ? <Video size={20} /> : <VideoOff size={20} className="text-[#ff3b30]" />} label={cameraOn ? "Stop Video" : "Start Video"} onClick={toggleCamera} />
        </div>

        {/* Center — horizontally scrollable on small screens */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 sm:flex-none justify-start sm:justify-center sm:absolute sm:left-1/2 sm:-translate-x-1/2 py-1">
          <ControlBtn icon={<Shield size={20} />} label="Host Tools" onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); const opening = panel !== "security"; setPanel(opening ? "security" : "none"); setShowMoreMenu(false); setShowReactionPicker(false); if (opening && e) openAbove("host", e.currentTarget as HTMLElement); }} active={panel === "security"} />
          <ControlBtn badge={waitingParticipants.length} icon={<Users size={20} />} label="Participants" onClick={() => setPanel(panel === "participants" ? "none" : "participants")} active={panel === "participants"} />
          <ControlBtn icon={<MessageCircle size={20} />} label="Chat" onClick={() => setPanel(panel === "chat" ? "none" : "chat")} active={panel === "chat"} />
          <ControlBtn caret icon={<Heart size={20} />} label="React" onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); const opening = !showReactionPicker; setShowReactionPicker(opening); setShowMoreMenu(false); if (opening && e) openAbove("react", e.currentTarget as HTMLElement); }} active={showReactionPicker} />
          <ControlBtn caret icon={<Upload size={20} className="text-[#23d85d]" />} label={screenSharing ? "Stop Share" : "Share"} onClick={toggleScreen} active={screenSharing} />
          <ControlBtn icon={<Hand size={20} className={handRaised ? "text-[#fe7521]" : ""} />} label={handRaised ? "Lower Hand" : "Raise Hand"} onClick={() => setHandRaised((v) => !v)} active={handRaised} />
          <ControlBtn caret icon={<MoreHorizontal size={20} />} label="More" onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); const opening = !showMoreMenu; setShowMoreMenu(opening); setShowViewMenu(false); setShowInfoPanel(false); setShowReactionPicker(false); if (opening && e) openAbove("more", e.currentTarget as HTMLElement); }} active={showMoreMenu} />
        </div>

        {/* Right — Zoom-style End (red mark + label) */}
        <button onClick={() => setShowEndDialog(true)} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-[#e03e3e]/20 transition-colors group shrink-0">
          <span className="w-7 h-7 rounded-lg bg-[#e03e3e] group-hover:bg-[#c0392b] flex items-center justify-center transition-colors">
            <X size={16} className="text-white" strokeWidth={2.5} />
          </span>
          <span className="text-[10px] font-medium text-white/70 group-hover:text-white whitespace-nowrap">End</span>
        </button>
      </div>

      {/* End meeting dialog (Zoom: centered) */}
      {showEndDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-[#2d2d2d] rounded-2xl border border-white/10 shadow-2xl p-6 w-80">
            <div className="space-y-2">
              <button onClick={handleEnd} className="w-full py-3 bg-[#e03e3e] hover:bg-[#c0392b] text-white font-semibold rounded-xl transition-colors text-[14px]">
                End Meeting for All
              </button>
              <button onClick={handleLeave}
                className="w-full py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/15 transition-colors text-[14px]">
                Leave Meeting
              </button>
              <div className="flex items-center justify-between pt-3">
                <button onClick={() => setGiveFeedbackOpt((v) => !v)} className="flex items-center gap-2 text-[13px] text-[#ccc] hover:text-white transition-colors">
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${giveFeedbackOpt ? "bg-[#0B5CFF] border-[#0B5CFF]" : "border-[#666]"}`}>
                    {giveFeedbackOpt && <Check size={10} className="text-white" />}
                  </div>
                  Give feedback
                </button>
                <button onClick={() => setShowEndDialog(false)} className="text-[#888] hover:text-white transition-colors text-[13px]">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlBtn({
  icon, label, onClick, active = false, caret = false, badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e?: React.MouseEvent) => void;
  active?: boolean;
  /** Show the small submenu caret next to the icon (only where a popup exists). */
  caret?: boolean;
  /** Count pill (e.g. participants) shown above the icon, like Zoom. */
  badge?: number;
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors group shrink-0 ${active ? "bg-white/15" : "hover:bg-white/10"}`}>
      <span className="flex items-start gap-1 h-5">
        <span className="relative leading-none">
          {icon}
          {typeof badge === "number" && badge > 0 && (
            <span className="absolute -top-2 -right-2.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-white/30 text-white text-[9px] font-bold flex items-center justify-center">
              {badge}
            </span>
          )}
        </span>
        {caret && <ChevronUp size={11} className="mt-1 text-white/40 group-hover:text-white/70 shrink-0" />}
      </span>
      <span className="text-[10px] font-medium text-white/70 group-hover:text-white whitespace-nowrap">{label}</span>
    </button>
  );
}
