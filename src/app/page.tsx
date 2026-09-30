"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useDashboardSummary, useCreateMeeting, useMe } from "@/lib/hooks";
import { formatMeetingId, initials, avatarColor } from "@/lib/utils";
import { format } from "date-fns";
import {
  Copy,
  Video,
  Clock,
  Users,
  Calendar,
  MessageCircle,
  Check,
  Loader2,
} from "lucide-react";

const BRAND = "#0B5CFF";

export default function HomePage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: me } = useMe();
  const createMeeting = useCreateMeeting();

  const HOST_NAME = me?.displayName ?? "Ketan Arora";
  const HOST_EMAIL = me?.email ?? "ketan.arora019@gmail.com";
  // Personal Meeting ID is derived from the backend user id so it is stable
  // per account without hardcoding a magic number.
  const PMI = me ? formatMeetingId(String(1000000000 + me.id * 7919).slice(0, 10)) : "—";

  const copyPMI = () => {
    if (!me) return;
    navigator.clipboard.writeText(PMI.replace(/\s/g, "")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewMeeting = async () => {
    setActionError("");
    try {
      const m = await createMeeting.mutateAsync({
        title: `${HOST_NAME}'s Meeting`,
        type: "instant",
        durationMinutes: 60,
      });
      router.push(`/room/${m.meetingId}`);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not start the meeting. Try again."
      );
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto p-4 sm:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* ── Left column ─────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-[#ebebeb] p-6 shadow-sm">
            <div className="flex items-center gap-5">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl shrink-0"
                style={{ backgroundColor: avatarColor(HOST_NAME) }}
              >
                {initials(HOST_NAME)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1a1a1a]">{HOST_NAME}</h1>
                <p className="text-sm text-[#666] mt-0.5">{HOST_EMAIL}</p>
                <p className="text-xs text-[#999] mt-1">
                  Personal Meeting ID: <span className="font-mono">{PMI}</span>
                </p>
              </div>
            </div>
          </div>

          {actionError && (
            <div className="bg-[#fff0f0] border border-[#f5c2c2] text-[#c0392b] text-[13px] px-4 py-3 rounded-xl">
              {actionError}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Total Meetings",
                value: summary?.totalMeetings ?? "—",
                icon: <Video size={20} className="text-[#0b6bde]" />,
              },
              {
                label: "Upcoming",
                value: summary?.upcomingCount ?? "—",
                icon: <Clock size={20} className="text-[#fe7521]" />,
              },
              {
                label: "Recent",
                value: summary?.recentCount ?? "—",
                icon: <Users size={20} className="text-[#16a34a]" />,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl border border-[#ebebeb] p-5 shadow-sm flex flex-col gap-2"
              >
                {stat.icon}
                <p className="text-2xl font-bold text-[#1a1a1a]">
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin text-[#999]" />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-[13px] text-[#666]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Recent meetings */}
          <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f5f5f5] flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#1a1a1a]">Recent Meetings</h2>
              <button
                onClick={() => router.push("/meetings")}
                className="text-[13px] text-[#0b6bde] font-medium hover:underline"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-[#f5f5f5]">
              {isLoading ? (
                <div className="px-6 py-8 flex justify-center">
                  <Loader2 size={24} className="animate-spin text-[#0b6bde]" />
                </div>
              ) : summary?.recentMeetings?.length ? (
                summary.recentMeetings.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors group cursor-pointer"
                    onClick={() => router.push(`/meetings`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#eef5ff] flex items-center justify-center shrink-0">
                        <Video size={18} className="text-[#0b6bde]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#1a1a1a]">{m.title}</p>
                        <p className="text-[12px] text-[#888] font-mono mt-0.5">
                          {formatMeetingId(m.meetingId)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] text-[#888]">
                        {m.createdAt
                          ? format(new Date(m.createdAt), "MMM d, h:mm a")
                          : "—"}
                      </p>
                      <p
                        className={[
                          "text-[11px] font-medium mt-0.5 capitalize",
                          m.status === "active"
                            ? "text-[#16a34a]"
                            : m.status === "ended"
                            ? "text-[#999]"
                            : "text-[#fe7521]",
                        ].join(" ")}
                      >
                        {m.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-10 text-center">
                  <Calendar
                    size={36}
                    className="text-[#ddd] mx-auto mb-3"
                  />
                  <p className="text-[14px] font-semibold text-[#666]">No meetings yet</p>
                  <p className="text-[12px] text-[#999] mt-1">
                    Host or join a meeting to get started.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming meetings */}
          {(summary?.upcomingMeetings?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#f5f5f5] flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-[#1a1a1a]">
                  Upcoming Meetings
                </h2>
              </div>
              <div className="divide-y divide-[#f5f5f5]">
                {summary!.upcomingMeetings.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors cursor-pointer"
                    onClick={() => router.push(`/launch/${m.meetingId}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#fff5ee] flex items-center justify-center shrink-0">
                        <Clock size={18} className="text-[#fe7521]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#1a1a1a]">{m.title}</p>
                        {m.scheduledAt && (
                          <p className="text-[12px] text-[#888] mt-0.5">
                            {format(new Date(m.scheduledAt), "MMM d, yyyy · h:mm a")}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/launch/${m.meetingId}`);
                      }}
                      className="px-4 py-1.5 bg-[#0B5CFF] text-white text-[13px] font-medium rounded-lg hover:bg-[#0047cc] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5CFF]"
                    >
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column ─────────────────────────────── */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5">
          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-[#ebebeb] p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-1">
              {/* New Meeting */}
              <button
                onClick={handleNewMeeting}
                className="flex flex-col items-center gap-2 group"
                disabled={createMeeting.isPending}
              >
                <div className="w-12 h-12 bg-[#fe7521] rounded-[18px] flex items-center justify-center text-white shadow-sm group-hover:bg-[#e05b2b] transition-colors">
                  <Video size={20} />
                </div>
                <span className="text-[12px] font-medium text-[#666487] group-hover:text-[#0b6bde] transition-colors">
                  {createMeeting.isPending ? "Starting…" : "New Meeting"}
                </span>
              </button>

              {/* Join */}
              <button
                onClick={() => router.push("/join")}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 bg-[#0b6bde] rounded-[18px] flex items-center justify-center text-white shadow-sm group-hover:bg-[#0047cc] transition-colors">
                  <Users size={20} />
                </div>
                <span className="text-[12px] font-medium text-[#666487] group-hover:text-[#0b6bde] transition-colors">
                  Join
                </span>
              </button>

              {/* Schedule */}
              <button
                onClick={() => router.push("/schedule")}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 bg-[#0b6bde] rounded-[18px] flex items-center justify-center text-white shadow-sm group-hover:bg-[#0047cc] transition-colors">
                  <Calendar size={20} />
                </div>
                <span className="text-[12px] font-medium text-[#666487] group-hover:text-[#0b6bde] transition-colors">
                  Schedule
                </span>
              </button>
            </div>

            {/* PMI */}
            <div className="mt-6 text-center">
              <p className="text-[13px] font-semibold text-[#222]">
                Personal Meeting ID
              </p>
              <div className="mt-1 flex items-center justify-center gap-1">
                <span className="font-mono text-[14px] text-[#1a1a1a]">{PMI}</span>
                <button
                  onClick={copyPMI}
                  className="p-1.5 hover:bg-[#f0f2f4] rounded-lg transition-colors"
                  title="Copy PMI"
                >
                  {copied ? (
                    <Check size={14} className="text-[#16a34a]" />
                  ) : (
                    <Copy size={14} className="text-[#666]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Meetings list card */}
          <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f5f5f5] flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#1a1a1a]">Meetings</h3>
              <button
                onClick={() => router.push("/meetings")}
                className="text-[13px] text-[#0b6bde] font-medium hover:underline"
              >
                Visit Meetings
              </button>
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-[#0b6bde]" />
                </div>
              ) : (summary?.upcomingMeetings?.length ?? 0) === 0 ? (
                <div className="bg-[#f7f9fa] rounded-xl p-4 text-center">
                  <p className="text-[13px] font-semibold text-[#696f79]">
                    No Upcoming Meetings
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {summary!.upcomingMeetings.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className="p-3 bg-[#f7f9fa] rounded-xl flex items-center gap-3 cursor-pointer hover:bg-[#eef5ff] transition-colors"
                      onClick={() => router.push(`/launch/${m.meetingId}`)}
                    >
                      <Clock size={15} className="text-[#fe7521] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1a1a1a] truncate">
                          {m.title}
                        </p>
                        {m.scheduledAt && (
                          <p className="text-[11px] text-[#888] mt-0.5">
                            {format(new Date(m.scheduledAt), "h:mm a")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => router.push("/schedule")}
                className="mt-4 w-full h-[33px] border border-[#cfd4db] rounded-lg text-[13px] text-[#2a2b2d] hover:bg-[#f5f5f5] transition-colors"
              >
                Test Audio and Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating chat support */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-[#0b6bde] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform group z-50">
        <MessageCircle size={26} />
        <div className="absolute top-1/2 -translate-y-1/2 right-full mr-4 bg-white text-[#1a1a1a] px-3 py-1.5 rounded-lg text-[13px] font-semibold shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[#ebebeb] pointer-events-none">
          Chat with Support
        </div>
      </button>
    </AppLayout>
  );
}
