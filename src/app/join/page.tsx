"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useJoinMeeting, useMe } from "@/lib/hooks";
import {
  formatMeetingId,
  extractMeetingCode,
  isValidDisplayName,
} from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { Video, VideoOff, Mic, MicOff, Loader2, ArrowLeft } from "lucide-react";

type Phase = "form" | "preview";

export default function JoinPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [meetingInput, setMeetingInput] = useState("");
  const { data: me } = useMe();
  const [displayName, setDisplayName] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [resolvedId, setResolvedId] = useState("");

  const joinMeeting = useJoinMeeting();

  // Prefill the display name from the logged-in user once loaded.
  useEffect(() => {
    if (me && !displayName) setDisplayName(me.displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  // ── Camera/mic preview ──────────────────────────────────────────────────
  const startPreview = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(s);
    } catch {
      // user denied or device unavailable — continue without preview
      setCameraOn(false);
      setMicOn(false);
    }
  }, []);

  useEffect(() => {
    if (phase === "preview") startPreview();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCamera = () => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = !cameraOn));
    setCameraOn((v) => !v);
  };
  const toggleMic = () => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleFormNext = () => {
    const code = extractMeetingCode(meetingInput);
    if (!code) {
      setError("Enter a valid Meeting ID or paste a full invite link.");
      return;
    }
    if (!isValidDisplayName(displayName)) {
      setError("Please enter your display name.");
      return;
    }
    setResolvedId(code);
    setError("");
    setPhase("preview");
  };

  const handleJoin = async () => {
    if (!isValidDisplayName(displayName)) {
      setError("Please enter your display name.");
      return;
    }
    setError("");
    try {
      await joinMeeting.mutateAsync({
        id: resolvedId,
        displayName: displayName.trim(),
      });
      router.push(`/room/${resolvedId}`);
    } catch (e) {
      if (e instanceof ApiError && e.isGone) {
        setError("This meeting has ended and can no longer be joined.");
      } else if (e instanceof ApiError && e.isNotFound) {
        setError("Meeting not found. Please check the ID and try again.");
      } else {
        setError(
          e instanceof Error ? e.message : "Could not join. Please try again."
        );
      }
      setPhase("form");
    }
  };

  // ── Render: form phase ──────────────────────────────────────────────────
  if (phase === "form") {
    return (
      <AppLayout hideSidebar>
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#ebebeb] shadow-sm p-8">
            <h1 className="text-2xl font-bold text-[#1a1a1a] mb-1">Join a Meeting</h1>
            <p className="text-[14px] text-[#666] mb-6">
              Enter a Meeting ID or paste a full invite link.
            </p>

            <label className="block text-[13px] font-medium text-[#444] mb-1.5">
              Meeting ID or invite link
            </label>
            <input
              type="text"
              placeholder="123 456 7890 or https://…/join/1234567890"
              value={meetingInput}
              onChange={(e) => setMeetingInput(e.target.value.slice(0, 300))}
              onKeyDown={(e) => e.key === "Enter" && handleFormNext()}
              className="w-full px-4 py-3 text-[15px] border border-[#ddd] rounded-xl outline-none focus:border-[#0B5CFF] focus:ring-2 focus:ring-[#0B5CFF]/20 transition-colors mb-4 font-mono"
              autoFocus
            />

            <label className="block text-[13px] font-medium text-[#444] mb-1.5">
              Your Name <span className="text-[#e03e3e]">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              maxLength={120}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleFormNext()}
              placeholder="e.g. Ada Lovelace"
              className="w-full px-4 py-3 text-[15px] border border-[#ddd] rounded-xl outline-none focus:border-[#0B5CFF] focus:ring-2 focus:ring-[#0B5CFF]/20 transition-colors mb-2"
            />

            {error && (
              <p role="alert" className="text-[13px] text-[#e03e3e] mb-3">{error}</p>
            )}

            <button
              onClick={handleFormNext}
              disabled={!meetingInput.trim() || !isValidDisplayName(displayName)}
              className="w-full mt-4 py-3 bg-[#0B5CFF] text-white font-semibold rounded-xl hover:bg-[#0047cc] transition-colors text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full mt-2 py-2.5 text-[14px] text-[#666] hover:text-[#333] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Render: preview phase ───────────────────────────────────────────────
  if (phase === "preview") {
    return (
      <AppLayout hideSidebar>
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <button
              onClick={() => setPhase("form")}
              className="flex items-center gap-1.5 text-[14px] text-[#666] hover:text-[#333] mb-5 transition-colors"
            >
              <ArrowLeft size={15} /> Back
            </button>

            <div className="flex gap-6 flex-col md:flex-row">
              {/* Camera preview */}
              <div className="flex-1 bg-[#1a1a1a] rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative">
                {stream && cameraOn ? (
                  <video
                    ref={(el) => {
                      if (el) el.srcObject = stream;
                    }}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white">
                    <VideoOff size={36} className="text-[#555]" />
                    <span className="text-[13px] text-[#777]">Camera off</span>
                  </div>
                )}
                {/* Controls overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <button
                    onClick={toggleMic}
                    className={[
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      micOn
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-[#e03e3e] text-white",
                    ].join(" ")}
                  >
                    {micOn ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                  <button
                    onClick={toggleCamera}
                    className={[
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      cameraOn
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-[#e03e3e] text-white",
                    ].join(" ")}
                  >
                    {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Right panel */}
              <div className="w-full md:w-64 flex flex-col justify-center">
                <div className="bg-white rounded-2xl border border-[#ebebeb] p-5 shadow-sm">
                  <h2 className="text-[16px] font-bold text-[#1a1a1a] mb-1">
                    Ready to join?
                  </h2>
                  <p className="text-[13px] text-[#888] mb-4">
                    Meeting ID:{" "}
                    <span className="font-mono text-[#444]">
                      {formatMeetingId(resolvedId)}
                    </span>
                  </p>
                  <p className="text-[12px] text-[#888] mb-1">Joining as</p>
                  <p className="text-[14px] font-semibold text-[#1a1a1a] mb-5">
                    {displayName}
                  </p>

                  {error && (
                    <p className="text-[12px] text-[#e03e3e] mb-3">{error}</p>
                  )}

                  <button
                    onClick={handleJoin}
                    disabled={joinMeeting.isPending || !isValidDisplayName(displayName)}
                    className="w-full py-2.5 bg-[#0B5CFF] text-white text-[14px] font-semibold rounded-xl hover:bg-[#0047cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {joinMeeting.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : null}
                    Join Meeting
                  </button>
                  <button
                    onClick={() => setPhase("form")}
                    className="w-full mt-2 py-2 text-[13px] text-[#666] hover:text-[#333] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Render: preview handles the join; no fake waiting room ─────────────
  // (The backend admits immediately; a real waiting-room state would come
  // from participant.isAdmitted === false via the participants endpoint.)
  if (phase !== "form" && phase !== "preview") {
    return (
      <AppLayout hideSidebar>
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-[#eef5ff] rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 size={28} className="animate-spin text-[#0B5CFF]" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">Joining…</h2>
            <p className="text-[14px] text-[#666] mb-2">
              Meeting:{" "}
              <span className="font-mono text-[#444]">
                {formatMeetingId(resolvedId)}
              </span>
            </p>
            <p className="text-[13px] text-[#888] mb-6">{displayName}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return null;
}
