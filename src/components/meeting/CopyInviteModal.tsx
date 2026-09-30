"use client";

/**
 * "Copy Invitation" modal (Zoom bonus item + Meetings-page parity).
 *
 * Shows the full Zoom-style invitation text for a meeting and copies it
 * to the clipboard. Purely presentational — data comes from the API model.
 */

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { format } from "date-fns";
import type { Meeting } from "@/lib/api";
import { formatMeetingId } from "@/lib/utils";

interface Props {
  meeting: Meeting;
  onClose: () => void;
}

export function buildInvitationText(m: Meeting): string {
  const lines = [
    `${m.hostName} is inviting you to a ${m.type === "instant" ? "Zoom meeting" : "scheduled Zoom meeting"}.`,
    ``,
    `Topic: ${m.title}`,
    m.scheduledAt
      ? `Time: ${format(new Date(m.scheduledAt), "MMM d, yyyy h:mm a")}`
      : null,
    ``,
    `Join Zoom Meeting`,
    m.inviteLink,
    ``,
    `Meeting ID: ${formatMeetingId(m.meetingId)}`,
    m.passcode ? `Passcode: ${m.passcode}` : null,
  ].filter((l): l is string => l !== null);
  return lines.join("\n");
}

export default function CopyInviteModal({ meeting, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const text = buildInvitationText(meeting);

  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
          <h3 className="text-[16px] font-bold text-[#1a1a1a]">Meeting Invitation</h3>
          <button onClick={onClose} className="text-[#999] hover:text-[#333] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4">
          <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#333] bg-[#f7f9fa] rounded-xl p-4 max-h-72 overflow-y-auto font-sans">
            {text}
          </pre>
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#0B5CFF] text-white text-[14px] font-semibold rounded-xl hover:bg-[#0047cc] transition-colors"
          >
            {copied ? <Check size={15} className="text-white" /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy Invitation"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-[#ddd] rounded-xl text-[14px] font-medium text-[#444] hover:bg-[#f5f5f5] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
