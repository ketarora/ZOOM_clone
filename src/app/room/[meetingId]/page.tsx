"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type RefCallback,
} from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, MessageCircle, Smile,
  Monitor, MoreHorizontal, ShieldCheck, ChevronUp, X, Send, Maximize2,
  LayoutGrid, Hand, Shield, Settings, RotateCcw, Check, Copy, Loader2,
  VolumeX, UserX,
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // ── New dropdown / overlay state ────────────────────────────────────────
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
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
    try {
      await endMeeting.mutateAsync(apiId);
    } catch {
      // already ended on the server — still exit cleanly
    }
    setShowEndDialog(false);
    setPhase("ended");
    setShowFeedback(true);
    stopMedia();
  };

  const handleLeave = async () => {
    try {
      await leaveMeeting.mutateAsync({ id: apiId, displayName: HOST_NAME });
    } catch {
      // leaving a missing meeting still exits cleanly
    }
    setShowEndDialog(false);
    setPhase("ended");
    setShowFeedback(true);
    stopMedia();
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
      {(showMoreMenu || showViewMenu || showInfoPanel || showReactionPicker) && (
        <div className="fixed inset-0 z-40" onClick={closeAllMenus} />
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

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="h-10 px-4 flex items-center justify-between text-white bg-black/50 backdrop-blur-sm shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-bold text-[#0b6bde]">zoom</span>
          <span className="text-[13px] text-[#666]">Workplace</span>
        </div>

        <div className="flex items-center gap-4 relative">
          {/* Green shield — info panel toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowInfoPanel((v) => !v); setShowViewMenu(false); setShowMoreMenu(false); }}
            className="hover:opacity-80 transition-opacity"
          >
            <ShieldCheck size={16} className="text-[#23d85d]" />
          </button>

          <span className="text-[13px] font-mono text-[#666]">{formatElapsed(elapsed)}</span>

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

          {/* Info panel overlay */}
          {showInfoPanel && (
            <div className="absolute top-10 right-0 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl z-50 w-80 p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[15px] font-bold text-white mb-4">{meeting?.title ?? `${HOST_NAME}'s Zoom Meeting`}</h3>
              <div className="space-y-3">
                {[
                  { label: "Meeting ID", value: formatMeetingId(meetingId), mono: true },
                  { label: "Host", value: meeting?.hostName ?? `${HOST_NAME} (You)`, mono: false },
                  ...(meeting?.passcode
                    ? [{ label: "Passcode", value: meeting.passcode, mono: true as const }]
                    : []),
                  { label: "Status", value: meeting?.status ?? "active", mono: false, green: true },
                  { label: "Encryption", value: "Enabled", mono: false, green: true },
                ].map(({ label, value, mono, green }) => (
                  <div key={label} className="flex gap-4">
                    <span className="text-[12px] text-[#888] w-36 shrink-0">{label}</span>
                    <span className={`text-[12px] ${mono ? "font-mono" : ""} ${green ? "text-[#23d85d]" : "text-white"}`}>{value}</span>
                  </div>
                ))}
                <div className="flex gap-4 items-start">
                  <span className="text-[12px] text-[#888] w-36 shrink-0">Invite Link</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-[#5b9eff] truncate max-w-[140px]">
                      {meeting?.inviteLink ?? `…/join/${meetingId}`}
                    </span>
                    <button onClick={copyInviteLink} className="shrink-0 text-[#5b9eff] hover:text-white transition-colors">
                      {copiedInvite ? <Check size={12} className="text-[#23d85d]" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#555] mt-4 leading-relaxed">
                You are connected to the Zoom Global Network via a data center in India.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main viewport ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
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

        {/* ── Side panel ─────────────────────────────────────────────────── */}
        {panel !== "none" && (
          <div className="w-72 bg-[#1e1e1e] border-l border-white/10 flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-[14px] font-semibold text-white capitalize">
                {panel === "participants"
                  ? `Participants (${waitingParticipants.length})`
                  : panel === "chat"
                  ? "In-Meeting Chat"
                  : "Host Tools"}
              </span>
              <button onClick={() => setPanel("none")} className="text-[#777] hover:text-white transition-colors">
                <X size={16} />
              </button>
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

              {/* Host Tools (was Security) */}
              {panel === "security" && (
                <div className="p-4 space-y-1">
                  {/* Lock + waiting room + hide pics */}
                  {[
                    { label: "Lock Meeting", value: lockMeeting, setter: setLockMeeting },
                    { label: "Enable waiting room", value: waitingRoomOn, setter: setWaitingRoomOn },
                    { label: "Hide profile pictures", value: hideProfilePics, setter: setHideProfilePics },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="flex items-center justify-between py-2.5 border-b border-white/5">
                      <span className="text-[13px] text-[#ccc]">{label}</span>
                      <MiniToggle value={value} onChange={setter} />
                    </div>
                  ))}

                  {/* Allow participants to */}
                  <div className="pt-3">
                    <p className="text-[12px] font-semibold text-white mb-2">Allow participants to:</p>
                    {[
                      { label: "Share Screen", value: allowScreenShare, setter: setAllowScreenShare },
                      { label: "Chat", value: allowChatPerm, setter: setAllowChatPerm },
                      { label: "Rename Themselves", value: allowRename, setter: setAllowRename },
                      { label: "Unmute Themselves", value: allowUnmuteSelf, setter: setAllowUnmuteSelf },
                      { label: "Start Video", value: allowStartVideo, setter: setAllowStartVideo },
                      { label: "Share Whiteboards", value: allowWhiteboards, setter: setAllowWhiteboards },
                    ].map(({ label, value, setter }) => (
                      <button key={label} onClick={() => setter(!value)}
                        className="w-full flex items-center gap-3 py-1.5 hover:bg-white/5 rounded-lg px-1 transition-colors">
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${value ? "bg-[#0b6bde] border-[#0b6bde]" : "border-[#555]"}`}>
                          {value && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-[13px] text-[#ccc]">{label}</span>
                      </button>
                    ))}
                  </div>

                  <button className="w-full mt-3 py-2 text-[13px] text-[#e03e3e] font-medium hover:bg-[#e03e3e]/10 rounded-lg transition-colors border border-[#e03e3e]/30">
                    Suspend Participant Activities
                  </button>
                </div>
              )}
            </div>

            {/* Chat input */}
            {panel === "chat" && (
              <div className="p-3 border-t border-white/10">
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Type a message…"
                    className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder-[#555]"
                  />
                  <button onClick={sendChat} className="text-[#0b6bde] hover:text-[#5b9eff] transition-colors">
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Floating popups (fixed: escape the scrollable toolbar so they never clip) ── */}
      {showReactionPicker && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 bg-[#2d2d2d] border border-white/10 rounded-2xl px-4 py-3 flex gap-2.5 shadow-2xl z-[60]" onClick={(e) => e.stopPropagation()}>
          {REACTIONS.map((emoji) => (
            <button key={emoji} onClick={() => fireReaction(emoji)} className="text-2xl hover:scale-125 transition-transform leading-none">{emoji}</button>
          ))}
        </div>
      )}
      {showMoreMenu && (
        <div className="fixed bottom-[88px] right-3 sm:right-6 bg-[#2d2d2d] border border-white/10 rounded-xl shadow-2xl z-[60] w-56 py-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setCaptionsOn((v) => !v); setShowMoreMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#ccc] hover:bg-white/10 transition-colors">
            <span className="w-7 h-5 border border-[#666] rounded text-[9px] flex items-center justify-center text-[#aaa] shrink-0 font-bold">CC</span>
            <span>{captionsOn ? "Hide Captions" : "Captions"}</span>
          </button>
          <button onClick={() => setShowMoreMenu(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#ccc] hover:bg-white/10 transition-colors">
            <LayoutGrid size={16} className="text-[#aaa] shrink-0" />
            <span>Breakout Rooms</span>
          </button>
          <div className="border-t border-white/10 my-1" />
          <button onClick={() => setShowMoreMenu(false)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-[#ccc] hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <Monitor size={16} className="text-[#aaa] shrink-0" />
              <span>Whiteboards</span>
            </div>
            <ChevronUp size={11} className="rotate-90 text-[#666]" />
          </button>
          <div className="border-t border-white/10 my-1" />
          <button onClick={() => { toggleFullscreen(); setShowMoreMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#ccc] hover:bg-white/10 transition-colors">
            <Settings size={16} className="text-[#aaa] shrink-0" />
            <span>Settings</span>
          </button>
          <button onClick={() => { setIncomingVideoOff((v) => !v); setShowMoreMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#ccc] hover:bg-white/10 transition-colors">
            <VideoOff size={16} className="text-[#aaa] shrink-0" />
            <span>{incomingVideoOff ? "Start Incoming Video" : "Stop Incoming Video"}</span>
          </button>
          <div className="border-t border-white/10 my-1" />
          <button onClick={() => setShowMoreMenu(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#ccc] hover:bg-white/10 transition-colors">
            <RotateCcw size={16} className="text-[#aaa] shrink-0" />
            <span>Reset to default</span>
          </button>
        </div>
      )}

      {/* ── Bottom control bar ──────────────────────────────────────────────── */}
      <div className="min-h-[72px] bg-black text-white flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-t border-white/10 shrink-0 z-30 relative">
        {/* Left */}
        <div className="flex items-center gap-1 shrink-0">
          <ControlBtn icon={micOn ? <Mic size={20} /> : <MicOff size={20} className="text-[#ff3b30]" />} label={micOn ? "Mute" : "Unmute"} onClick={toggleMic} />
          <ControlBtn icon={cameraOn ? <Video size={20} /> : <VideoOff size={20} className="text-[#ff3b30]" />} label={cameraOn ? "Stop Video" : "Start Video"} onClick={toggleCamera} />
        </div>

        {/* Center — horizontally scrollable on small screens */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 sm:flex-none justify-start sm:justify-center sm:absolute sm:left-1/2 sm:-translate-x-1/2 py-1">
          <ControlBtn icon={<Shield size={20} />} label="Host Tools" onClick={() => setPanel(panel === "security" ? "none" : "security")} active={panel === "security"} />
          <ControlBtn icon={<Users size={20} />} label="Participants" onClick={() => setPanel(panel === "participants" ? "none" : "participants")} active={panel === "participants"} />
          <ControlBtn icon={<MessageCircle size={20} />} label="Chat" onClick={() => setPanel(panel === "chat" ? "none" : "chat")} active={panel === "chat"} />
          <ControlBtn icon={<Smile size={20} />} label="Reactions" onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); setShowReactionPicker((v) => !v); setShowMoreMenu(false); }} active={showReactionPicker} />
          <ControlBtn icon={<Monitor size={20} className={screenSharing ? "text-[#23d85d]" : ""} />} label={screenSharing ? "Stop Share" : "Share Screen"} onClick={toggleScreen} active={screenSharing} />
          <ControlBtn icon={<Hand size={20} className={handRaised ? "text-[#fe7521]" : ""} />} label={handRaised ? "Lower Hand" : "Raise Hand"} onClick={() => setHandRaised((v) => !v)} active={handRaised} />
          <ControlBtn icon={<MoreHorizontal size={20} />} label="More" onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); setShowMoreMenu((v) => !v); setShowViewMenu(false); setShowInfoPanel(false); setShowReactionPicker(false); }} active={showMoreMenu} />
        </div>

        {/* Right */}
        <button onClick={() => setShowEndDialog(true)} className="flex items-center gap-2 px-5 py-2 bg-[#e03e3e] hover:bg-[#c0392b] rounded-xl transition-colors font-semibold text-[14px]">
          <PhoneOff size={18} />
          End
        </button>
      </div>

      {/* End meeting dialog */}
      {showEndDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-end p-8">
          <div className="bg-[#2d2d2d] rounded-2xl border border-white/10 shadow-2xl p-6 w-80">
            <h3 className="text-[16px] font-bold text-white mb-1">End Meeting?</h3>
            <p className="text-[13px] text-[#888] mb-5">You can leave the meeting or end it for everyone.</p>
            <div className="space-y-2">
              <button onClick={handleEnd} className="w-full py-3 bg-[#e03e3e] hover:bg-[#c0392b] text-white font-semibold rounded-xl transition-colors text-[14px]">
                End Meeting for All
              </button>
              <button onClick={handleLeave}
                className="w-full py-3 border border-white/20 text-white font-medium rounded-xl hover:bg-white/10 transition-colors text-[14px]">
                Leave Meeting
              </button>
              <button onClick={() => setShowEndDialog(false)} className="w-full py-2 text-[#888] hover:text-white transition-colors text-[13px]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlBtn({
  icon, label, onClick, active = false, caret = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e?: React.MouseEvent) => void;
  active?: boolean;
  /** Legacy flag for caret — safely ignored to keep DOM clean */
  caret?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors group shrink-0 ${active ? "bg-white/15" : "hover:bg-white/10"}`}>
      <span className="flex items-center justify-center h-5 w-full">
        {icon}
      </span>
      <span className="text-[10px] font-medium text-white/70 group-hover:text-white whitespace-nowrap">{label}</span>
    </button>
  );
}
