"use client";

/**
 * Floating self-view window (Zoom Web Client parity).
 *
 * Appears on every page except the room itself while a meeting is active.
 * Draggable anywhere, hover reveals mic/camera controls, click returns to
 * the room. Owns a lightweight local preview stream — the room re-acquires
 * its media when you go back, so tracks never leak across unmounts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import { formatMeetingId } from "@/lib/utils";

interface Props {
  meetingId: string;
  displayName: string;
  onHide: () => void;
}

export default function MiniMeetingWindow({ meetingId, displayName, onHide }: Props) {
  const router = useRouter();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [hover, setHover] = useState(false);
  // Offset from bottom-right corner; null = docked default.
  const [pos, setPos] = useState<{ right: number; bottom: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origR: number; origB: number } | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (alive) setStream(s);
        else s.getTracks().forEach((t) => t.stop());
      })
      .catch(() => alive && setCameraOn(false));
    return () => {
      alive = false;
      setStream((s) => {
        s?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
  }, []);

  const videoCb = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && stream) el.srcObject = stream;
    },
    [stream]
  );

  const toggleMic = (e: React.MouseEvent) => {
    e.stopPropagation();
    stream?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  };

  const toggleCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    stream?.getVideoTracks().forEach((t) => (t.enabled = !cameraOn));
    setCameraOn((v) => !v);
  };

  // ── Drag anywhere on the window ──────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origR: window.innerWidth - rect.right,
      origB: window.innerHeight - rect.bottom,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = boxRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 240;
    const h = rect?.height ?? 150;
    const right = Math.min(
      Math.max(d.origR - (e.clientX - d.startX), 8),
      window.innerWidth - w - 8
    );
    const bottom = Math.min(
      Math.max(d.origB - (e.clientY - d.startY), 8),
      window.innerHeight - h - 8
    );
    setPos({ right, bottom });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const style: React.CSSProperties = pos
    ? { right: pos.right, bottom: pos.bottom }
    : { right: 16, bottom: 16 };

  return (
    <div
      ref={boxRef}
      onClick={() => router.push(`/room/${meetingId}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={style}
      title="Click to go back to the meeting (drag to move)"
      className="fixed z-[60] w-60 aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-white/15 cursor-pointer select-none touch-none"
    >
      {stream && cameraOn ? (
        <video ref={videoCb} autoPlay muted playsInline className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#E05B2B] flex items-center justify-center text-white text-xl font-bold">
            {(displayName[0] ?? "Y").toUpperCase()}
          </div>
        </div>
      )}

      {/* Name + meeting id */}
      <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5 pointer-events-none">
        <span className="text-[11px] font-medium text-white bg-black/60 px-2 py-0.5 rounded-md truncate max-w-[130px]">
          {displayName}
        </span>
      </div>
      <div className="absolute top-1.5 left-2 pointer-events-none">
        <span className="text-[10px] font-mono text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
          {formatMeetingId(meetingId)}
        </span>
      </div>

      {/* Hover controls */}
      <div
        className={`absolute bottom-1.5 right-1.5 flex gap-1.5 transition-opacity ${
          hover ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={toggleMic}
          title={micOn ? "Mute" : "Unmute"}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            micOn ? "bg-black/70 hover:bg-black text-white" : "bg-[#e03e3e] text-white"
          }`}
        >
          {micOn ? <Mic size={13} /> : <MicOff size={13} />}
        </button>
        <button
          onClick={toggleCamera}
          title={cameraOn ? "Stop video" : "Start video"}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            cameraOn ? "bg-black/70 hover:bg-black text-white" : "bg-[#e03e3e] text-white"
          }`}
        >
          {cameraOn ? <Video size={13} /> : <VideoOff size={13} />}
        </button>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onHide();
        }}
        title="Hide (meeting keeps running)"
        className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-black text-white/80 flex items-center justify-center transition-opacity ${
          hover ? "opacity-100" : "opacity-0"
        }`}
      >
        <X size={12} />
      </button>
    </div>
  );
}
