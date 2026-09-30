"use client";

import { useParams, useRouter } from "next/navigation";
import { useMeeting, useEndMeeting, useMeetingParticipants } from "@/lib/hooks";
import { formatMeetingId, urlMeetingId } from "@/lib/utils";
import { format } from "date-fns";
import {
  Copy,
  Check,
  Video,
  Clock,
  Users,
  Shield,
  ExternalLink,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

export default function LaunchPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const router = useRouter();
  // Route params may arrive grouped ("353 039 4831") from old links —
  // always talk to the API with compact digits.
  const apiId = urlMeetingId(meetingId ?? "");
  const [copied, setCopied] = useState(false);
  const { data: meeting, isLoading } = useMeeting(apiId);
  const { data: participants = [] } = useMeetingParticipants(apiId, !!meeting);
  const endMeeting = useEndMeeting();

  const copyInvite = () => {
    const text = [
      "Join Zoom Meeting",
      meeting?.inviteLink ?? `Meeting ID: ${formatMeetingId(meetingId)}`,
      `Meeting ID: ${formatMeetingId(meetingId)}`,
      ...(meeting?.passcode ? [`Passcode: ${meeting.passcode}`] : []),
    ].join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => router.push(`/room/${apiId}`);

  const handleEnd = async () => {
    await endMeeting.mutateAsync(apiId);
    router.push("/meetings");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#0b6bde]" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-4">
        <p className="text-[18px] font-semibold text-[#555]">Meeting not found</p>
        <button
          onClick={() => router.push("/meetings")}
          className="text-[#0b6bde] text-[14px] hover:underline"
        >
          Back to Meetings
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Nav */}
      <div className="bg-white border-b border-[#ebebeb] px-6 h-[60px] flex items-center">
        <button
          onClick={() => router.push("/meetings")}
          className="flex items-center gap-1.5 text-[14px] text-[#666] hover:text-[#333] transition-colors"
        >
          <ChevronLeft size={16} />
          Meetings
        </button>
        <span className="mx-3 text-[#ddd]">·</span>
        <span className="text-[#0b6bde] font-bold text-[22px]">zoom</span>
      </div>

      <div className="max-w-4xl mx-auto p-8 flex flex-col md:flex-row gap-6">
        {/* Main card */}
        <div className="flex-1 bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#0b6bde] px-8 py-6">
            <p className="text-white/70 text-[12px] font-medium uppercase tracking-wide mb-1">
              {meeting.type === "instant" ? "Instant Meeting" : "Scheduled Meeting"}
            </p>
            <h1 className="text-white text-2xl font-bold">{meeting.title}</h1>
            {meeting.description && (
              <p className="text-white/80 text-[14px] mt-1">{meeting.description}</p>
            )}
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            {/* Meeting ID */}
            <div className="flex items-center justify-between p-4 bg-[#f7f9fa] rounded-xl">
              <div>
                <p className="text-[12px] font-medium text-[#888] mb-0.5">Meeting ID</p>
                <p className="font-mono text-[18px] font-bold text-[#1a1a1a] tracking-wider">
                  {formatMeetingId(meeting.meetingId)}
                </p>
              </div>
              <button
                onClick={copyInvite}
                className="flex items-center gap-1.5 px-3 py-2 border border-[#ddd] rounded-lg text-[13px] text-[#444] hover:bg-white transition-colors"
              >
                {copied ? (
                  <Check size={14} className="text-[#16a34a]" />
                ) : (
                  <Copy size={14} />
                )}
                {copied ? "Copied!" : "Copy Invite"}
              </button>
            </div>

            {/* Meta row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: <Clock size={16} className="text-[#fe7521]" />,
                  label: "Duration",
                  value: `${meeting.durationMinutes} min`,
                },
                {
                  icon: <Users size={16} className="text-[#0b6bde]" />,
                  label: "Participants",
                  value: participants.length.toString(),
                },
                {
                  icon: <Shield size={16} className="text-[#16a34a]" />,
                  label: "Status",
                  value:
                    meeting.status.charAt(0).toUpperCase() +
                    meeting.status.slice(1),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-3 bg-[#f7f9fa] rounded-xl flex flex-col gap-1"
                >
                  <div className="flex items-center gap-1.5">
                    {item.icon}
                    <span className="text-[11px] font-medium text-[#888] uppercase tracking-wide">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[15px] font-bold text-[#1a1a1a]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Scheduled at */}
            {meeting.scheduledAt && (
              <div className="flex items-center gap-3 p-4 bg-[#fff5ee] rounded-xl border border-[#fde8d0]">
                <Clock size={16} className="text-[#fe7521] shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-[#888]">Scheduled for</p>
                  <p className="text-[14px] font-semibold text-[#1a1a1a]">
                    {format(
                      new Date(meeting.scheduledAt),
                      "EEEE, MMMM d, yyyy 'at' h:mm a"
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Passcode */}
            {meeting.passcode && (
              <div className="flex items-center gap-3 p-4 bg-[#f0fdf4] rounded-xl border border-[#bbf7d0]">
                <Shield size={16} className="text-[#16a34a] shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-[#888]">Passcode</p>
                  <p className="font-mono text-[16px] font-bold text-[#1a1a1a]">
                    {meeting.passcode}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            {meeting.status !== "ended" ? (
              <>
                <button
                  onClick={handleStart}
                  className="flex-1 py-3 bg-[#0b6bde] text-white font-semibold rounded-xl hover:bg-[#0047cc] transition-colors flex items-center justify-center gap-2"
                >
                  <Video size={18} />
                  Start Meeting
                </button>
                <button
                  onClick={handleEnd}
                  disabled={endMeeting.isPending}
                  className="px-5 py-3 border border-[#e03e3e] text-[#e03e3e] rounded-xl hover:bg-[#fff0f0] transition-colors text-[14px] font-medium disabled:opacity-60"
                >
                  {endMeeting.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    "End"
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push("/meetings")}
                className="flex-1 py-3 border border-[#ddd] text-[#555] rounded-xl hover:bg-[#f5f5f5] transition-colors font-medium"
              >
                Back to Meetings
              </button>
            )}
          </div>
        </div>

        {/* Participants panel */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f5f5f5] flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#1a1a1a]">
                Participants ({participants.length})
              </h3>
            </div>
            <div className="divide-y divide-[#f5f5f5] max-h-64 overflow-y-auto">
              {participants.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <Users size={28} className="text-[#ddd] mx-auto mb-2" />
                  <p className="text-[13px] text-[#888]">No participants yet</p>
                </div>
              ) : (
                participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#eef5ff] flex items-center justify-center text-[12px] font-bold text-[#0b6bde] shrink-0">
                      {p.displayName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1a1a1a] truncate">
                        {p.displayName}
                        {p.isHost && (
                          <span className="ml-1.5 text-[10px] bg-[#eef5ff] text-[#0b6bde] px-1.5 py-0.5 rounded-full font-semibold">
                            Host
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#888]">
                        {p.isAdmitted ? "In meeting" : "Waiting"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Invite link */}
          <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm p-5">
            <p className="text-[13px] font-semibold text-[#1a1a1a] mb-2">
              Invite Link
            </p>
            <p className="text-[12px] text-[#888] font-mono truncate mb-3">
              {meeting.inviteLink}
            </p>
            <button
              onClick={copyInvite}
              className="w-full py-2 border border-[#ddd] rounded-lg text-[13px] text-[#444] hover:bg-[#f5f5f5] transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink size={13} />
              Share Invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
