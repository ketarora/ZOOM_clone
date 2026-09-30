"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useCreateMeeting } from "@/lib/hooks";
import { format, addMinutes } from "date-fns";
import { Calendar, Clock, Loader2, Check, Copy } from "lucide-react";
import { formatMeetingId, isFutureDateTime } from "@/lib/utils";
import { ApiError } from "@/lib/api";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export default function SchedulePage() {
  const router = useRouter();
  const createMeeting = useCreateMeeting();

  const defaultStart = addMinutes(new Date(), 30);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(defaultStart, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(defaultStart, "HH:mm"));
  const [duration, setDuration] = useState(60);
  const [passcode, setPasscode] = useState(
    Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [created, setCreated] = useState<{ meetingId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Topic is required.";
    if (!date) e.date = "Date is required.";
    if (!time) e.time = "Time is required.";
    if (date && time && !isFutureDateTime(date, time)) {
      e.time = "Pick a time in the future.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    try {
      const m = await createMeeting.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        type: "scheduled",
        scheduledAt,
        durationMinutes: duration,
        passcode: passcode.trim() || undefined,
      });
      setCreated({ meetingId: m.meetingId });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ title: err.message });
      } else {
        setErrors({ title: "Could not schedule. Please try again." });
      }
    }
  };

  const copyInvite = () => {
    if (!created) return;
    const text = `Join my Zoom meeting:\nMeeting ID: ${formatMeetingId(created.meetingId)}\nPasscode: ${passcode}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Success screen ─────────────────────────────────────────────────────
  if (created) {
    return (
      <AppLayout hideSidebar>
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#ebebeb] shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-[#e6f9ef] rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-[#16a34a]" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a1a] mb-1">
              Meeting Scheduled
            </h2>
            <p className="text-[14px] text-[#666] mb-6">
              Your meeting has been created successfully.
            </p>

            <div className="bg-[#f7f9fa] rounded-xl p-5 text-left mb-6">
              <p className="text-[13px] font-semibold text-[#1a1a1a] mb-3">{title}</p>
              <div className="space-y-2 text-[13px] text-[#555]">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-[#888]" />
                  <span>
                    {format(new Date(`${date}T${time}`), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-[#888]" />
                  <span>
                    {format(new Date(`${date}T${time}`), "h:mm a")} ·{" "}
                    {duration} min
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#ebebeb]">
                <p className="text-[12px] text-[#888] mb-0.5">Meeting ID</p>
                <p className="font-mono text-[14px] font-semibold text-[#1a1a1a]">
                  {formatMeetingId(created.meetingId)}
                </p>
              </div>
              {passcode && (
                <div className="mt-2">
                  <p className="text-[12px] text-[#888] mb-0.5">Passcode</p>
                  <p className="font-mono text-[14px] font-semibold text-[#1a1a1a]">
                    {passcode}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyInvite}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-[#ddd] rounded-xl text-[13px] font-medium text-[#333] hover:bg-[#f5f5f5] transition-colors"
              >
                {copied ? (
                  <Check size={14} className="text-[#16a34a]" />
                ) : (
                  <Copy size={14} />
                )}
                Copy Invite
              </button>
              <button
                onClick={() => router.push(`/launch/${created.meetingId}`)}
                className="flex-1 py-2.5 bg-[#0b6bde] text-white rounded-xl text-[13px] font-semibold hover:bg-[#0047cc] transition-colors"
              >
                Open Meeting
              </button>
            </div>
            <button
              onClick={() => router.push("/meetings")}
              className="mt-3 w-full text-[13px] text-[#666] hover:text-[#333] transition-colors"
            >
              View All Meetings
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Schedule form ──────────────────────────────────────────────────────
  return (
    <AppLayout hideSidebar>
      <div className="min-h-full flex items-start justify-center p-8">
        <div className="w-full max-w-xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1a1a1a]">
              Schedule a Meeting
            </h1>
            <p className="text-[14px] text-[#666] mt-1">
              Set up your meeting details below.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm p-8 space-y-5"
          >
            {/* Topic */}
            <div>
              <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                Topic <span className="text-[#e03e3e]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Meeting"
                className={[
                  "w-full px-4 py-2.5 text-[14px] border rounded-xl outline-none transition-colors",
                  errors.title
                    ? "border-[#e03e3e]"
                    : "border-[#ddd] focus:border-[#0b6bde]",
                ].join(" ")}
              />
              {errors.title && (
                <p className="text-[12px] text-[#e03e3e] mt-1">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                Description <span className="text-[#aaa]">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this meeting about?"
                rows={3}
                className="w-full px-4 py-2.5 text-[14px] border border-[#ddd] rounded-xl outline-none focus:border-[#0b6bde] transition-colors resize-none"
              />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                  Date <span className="text-[#e03e3e]">*</span>
                </label>
                <div className="relative">
                  <Calendar
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]"
                  />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={[
                      "w-full pl-9 pr-3 py-2.5 text-[14px] border rounded-xl outline-none transition-colors",
                      errors.date
                        ? "border-[#e03e3e]"
                        : "border-[#ddd] focus:border-[#0b6bde]",
                    ].join(" ")}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                  Time <span className="text-[#e03e3e]">*</span>
                </label>
                <div className="relative">
                  <Clock
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]"
                  />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={[
                      "w-full pl-9 pr-3 py-2.5 text-[14px] border rounded-xl outline-none transition-colors",
                      errors.time
                        ? "border-[#e03e3e]"
                        : "border-[#ddd] focus:border-[#0b6bde]",
                    ].join(" ")}
                  />
                </div>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={[
                      "px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors",
                      duration === d
                        ? "bg-[#0b6bde] border-[#0b6bde] text-white"
                        : "border-[#ddd] text-[#444] hover:border-[#0b6bde] hover:text-[#0b6bde]",
                    ].join(" ")}
                  >
                    {d < 60 ? `${d} min` : `${d / 60} hr${d > 60 ? "s" : ""}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Passcode */}
            <div>
              <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                Passcode
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Auto-generated"
                maxLength={10}
                className="w-full px-4 py-2.5 text-[14px] border border-[#ddd] rounded-xl outline-none focus:border-[#0b6bde] transition-colors font-mono"
              />
            </div>

            {/* Waiting room toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a1a]">
                  Waiting Room
                </p>
                <p className="text-[12px] text-[#888]">
                  Admit participants one by one
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={waitingRoom}
                onClick={() => setWaitingRoom((v) => !v)}
                className="relative"
              >
                <div
                  className={[
                    "w-11 h-6 rounded-full transition-colors",
                    waitingRoom ? "bg-[#0b6bde]" : "bg-[#ddd]",
                  ].join(" ")}
                />
                <div
                  className={[
                    "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
                    waitingRoom ? "left-[calc(100%-22px)]" : "left-0.5",
                  ].join(" ")}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex-1 py-2.5 border border-[#ddd] rounded-xl text-[14px] font-medium text-[#444] hover:bg-[#f5f5f5] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMeeting.isPending}
                className="flex-1 py-2.5 bg-[#0b6bde] text-white rounded-xl text-[14px] font-semibold hover:bg-[#0047cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {createMeeting.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
