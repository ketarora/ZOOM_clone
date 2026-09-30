"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useMeetings, useDeleteMeeting, useCreateMeeting, useMe } from "@/lib/hooks";
import { formatMeetingId, urlMeetingId, personalMeetingId } from "@/lib/utils";
import CopyInviteModal from "@/components/meeting/CopyInviteModal";
import { format } from "date-fns";
import {
  Video,
  Trash2,
  ExternalLink,
  Calendar,
  Plus,
  Loader2,
  Search,
  Clock,
  Users,
  Copy,
  Check,
} from "lucide-react";
import type { Meeting, MeetingFilter } from "@/lib/api";

const TABS: { label: string; value: MeetingFilter }[] = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Recent", value: "recent" },
  { label: "All", value: "all" },
];

export default function MeetingsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<MeetingFilter>("upcoming");
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useMeetings(filter);
  const deleteMeeting = useDeleteMeeting();
  const createMeeting = useCreateMeeting();
  const { data: me } = useMe();
  const [inviteFor, setInviteFor] = useState<Meeting | null>(null);
  const [pmiCopied, setPmiCopied] = useState(false);
  const PMI = me ? formatMeetingId(personalMeetingId(me.id)) : "—";

  const copyPMI = () => {
    if (!me) return;
    navigator.clipboard.writeText(PMI.replace(/\s/g, "")).catch(() => {});
    setPmiCopied(true);
    setTimeout(() => setPmiCopied(false), 2000);
  };

  // Backend returns a plain array (pagination in response headers).
  const rawMeetings: Meeting[] = Array.isArray(data) ? data : [];

  const meetings = rawMeetings.filter(
    (m) =>
      !search ||
      m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.meetingId?.includes(search)
  );

  const handleNewMeeting = async () => {
    try {
      const m = await createMeeting.mutateAsync({
        title: "Ketan Arora's Meeting",
        type: "instant",
        durationMinutes: 60,
      });
      router.push(`/room/${urlMeetingId(m.meetingId)}`);
    } catch (e) {
      console.error("Failed to create meeting", e);
    }
  };

  const emptyStateLabel =
    filter === "upcoming"
      ? { text: "No upcoming meetings", sub: "Schedule a meeting to see it here.", btn: "Schedule a Meeting", action: () => router.push("/schedule") }
      : filter === "recent"
      ? { text: "No recent meetings", sub: "Start a meeting to see it here.", btn: "Start a Meeting", action: handleNewMeeting }
      : { text: "No meetings yet", sub: "Start or schedule your first meeting.", btn: "New Meeting", action: handleNewMeeting };

  return (
    <AppLayout>
      <div className="max-w-[900px] mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Meetings</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/schedule")}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#0b6bde] text-[#0b6bde] text-[13px] font-medium rounded-lg hover:bg-[#eef5ff] transition-colors"
            >
              <Calendar size={14} />
              Schedule
            </button>
            <button
              onClick={handleNewMeeting}
              disabled={createMeeting.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0b6bde] text-white text-[13px] font-medium rounded-lg hover:bg-[#0047cc] transition-colors disabled:opacity-60"
            >
              {createMeeting.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              New Meeting
            </button>
          </div>
        </div>

        {/* PMI card (Zoom Meetings-page parity) */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden mb-5">
          <div className="bg-[#0B5CFF] px-6 py-5 text-center">
            <p className="text-white font-mono text-xl font-bold tracking-wider">{PMI}</p>
            <p className="text-white/80 text-[12px] mt-0.5">My Personal Meeting ID (PMI)</p>
          </div>
          <div className="flex items-center justify-center gap-2 px-6 py-4">
            <button
              onClick={handleNewMeeting}
              disabled={createMeeting.isPending}
              className="px-5 py-2 bg-[#0B5CFF] text-white text-[13px] font-semibold rounded-lg hover:bg-[#0047cc] transition-colors disabled:opacity-60"
            >
              Start
            </button>
            <button
              onClick={copyPMI}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#ddd] rounded-lg text-[13px] font-medium text-[#333] hover:bg-[#f5f5f5] transition-colors"
            >
              {pmiCopied ? <Check size={14} className="text-[#16a34a]" /> : <Copy size={14} />}
              {pmiCopied ? "Copied!" : "Copy Invitation"}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]"
          />
          <input
            type="text"
            placeholder="Search meetings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-[14px] border border-[#ddd] rounded-xl bg-white outline-none focus:border-[#0b6bde] transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-[#ebebeb]">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setFilter(t.value);
                setSearch("");
              }}
              className={[
                "px-5 py-2.5 text-[14px] font-medium border-b-2 transition-colors -mb-px",
                filter === t.value
                  ? "border-[#0b6bde] text-[#0b6bde]"
                  : "border-transparent text-[#666] hover:text-[#333]",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Meetings list */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-[#0b6bde]" />
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-[14px] text-[#e03e3e] font-medium">Failed to load meetings.</p>
              <p className="text-[12px] text-[#999] mt-1">Check your connection and try again.</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar size={44} className="text-[#ddd] mx-auto mb-4" />
              <p className="text-[15px] font-semibold text-[#555]">
                {emptyStateLabel.text}
              </p>
              <p className="text-[13px] text-[#999] mt-1">
                {emptyStateLabel.sub}
              </p>
              <button
                onClick={emptyStateLabel.action}
                disabled={createMeeting.isPending}
                className="mt-5 px-5 py-2 bg-[#0b6bde] text-white text-[13px] font-medium rounded-lg hover:bg-[#0047cc] transition-colors disabled:opacity-60"
              >
                {emptyStateLabel.btn}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#f5f5f5]">
              {meetings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[#fafafa] transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#eef5ff] flex items-center justify-center shrink-0">
                      <Video size={18} className="text-[#0b6bde]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#1a1a1a] truncate">
                        {m.title}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[12px] font-mono text-[#888]">
                          {formatMeetingId(m.meetingId)}
                        </span>
                        <span className="text-[#ddd]">·</span>
                        <span className="flex items-center gap-1 text-[12px] text-[#888]">
                          <Clock size={11} />
                          {m.scheduledAt
                            ? format(new Date(m.scheduledAt), "MMM d, yyyy · h:mm a")
                            : m.type === "instant"
                            ? "Instant meeting"
                            : "Scheduled"}
                        </span>
                        <span className="text-[#ddd]">·</span>
                        <span className="flex items-center gap-1 text-[12px] text-[#888]">
                          <Users size={11} />
                          {m.participantCount}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.status !== "ended" && (
                      <button
                        onClick={() =>
                          m.status === "active"
                            ? router.push(`/room/${urlMeetingId(m.meetingId)}`)
                            : router.push(`/launch/${urlMeetingId(m.meetingId)}`)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b6bde] text-white text-[12px] font-medium rounded-lg hover:bg-[#0047cc] transition-colors"
                      >
                        <ExternalLink size={12} />
                        {m.status === "active" ? "Join" : "Start"}
                      </button>
                    )}
                    <button
                      onClick={() => setInviteFor(m)}
                      className="p-2 text-[#999] hover:text-[#0B5CFF] hover:bg-[#eef5ff] rounded-lg transition-colors"
                      title="Copy invitation"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => deleteMeeting.mutate(m.meetingId)}
                      disabled={deleteMeeting.isPending}
                      className="p-2 text-[#999] hover:text-[#e03e3e] hover:bg-[#fff0f0] rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {inviteFor && (
        <CopyInviteModal meeting={inviteFor} onClose={() => setInviteFor(null)} />
      )}
    </AppLayout>
  );
}
