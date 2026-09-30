"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative shrink-0"
    >
      <div
        className={[
          "w-10 h-[22px] rounded-full transition-colors",
          value ? "bg-[#0b6bde]" : "bg-[#ccc]",
        ].join(" ")}
      />
      <div
        className={[
          "absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow transition-all",
          value ? "left-[calc(100%-20px)]" : "left-[2px]",
        ].join(" ")}
      />
    </button>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}
function SettingRow({ label, description, value, onChange }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#f5f5f5] last:border-0">
      <div className="flex-1 pr-6">
        <p className="text-[14px] font-medium text-[#1a1a1a]">{label}</p>
        {description && (
          <p className="text-[12px] text-[#888] mt-0.5">{description}</p>
        )}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  // Meeting settings
  const [hostVideo, setHostVideo] = useState(false);
  const [partVideo, setPartVideo] = useState(false);
  const [joinMuted, setJoinMuted] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [encryption, setEncryption] = useState(true);
  const [chat, setChat] = useState(true);
  const [privateChat, setPrivateChat] = useState(true);
  const [fileTransfer, setFileTransfer] = useState(true);
  const [transcript, setTranscript] = useState(false);
  const [reactions, setReactions] = useState(true);
  const [nonverbal, setNonverbal] = useState(true);
  const [attention, setAttention] = useState(false);
  // Recording
  const [cloudRecord, setCloudRecord] = useState(false);
  const [autoRecord, setAutoRecord] = useState(false);
  const [recordChat, setRecordChat] = useState(true);
  // Audio & Video
  const [stereo, setStereo] = useState(false);
  const [originalSound, setOriginalSound] = useState(false);
  const [hd, setHd] = useState(true);
  const [mirror, setMirror] = useState(true);
  const [virtualBg, setVirtualBg] = useState(false);

  const meetingSettings: SettingRowProps[] = [
    {
      label: "Host video",
      description: "Start meetings with host video on.",
      value: hostVideo,
      onChange: setHostVideo,
    },
    {
      label: "Participants video",
      description: "Start meetings with participant video on.",
      value: partVideo,
      onChange: setPartVideo,
    },
    {
      label: "Mute participants upon entry",
      description: "Automatically mute participants when they join.",
      value: joinMuted,
      onChange: setJoinMuted,
    },
    {
      label: "Waiting room",
      description: "Participants must be admitted before entering.",
      value: waitingRoom,
      onChange: setWaitingRoom,
    },
    {
      label: "Require encryption for 3rd party endpoints",
      value: encryption,
      onChange: setEncryption,
    },
    {
      label: "Chat",
      description: "Allow meeting participants to send messages.",
      value: chat,
      onChange: setChat,
    },
    {
      label: "Private chat",
      description: "Allow participants to send private 1:1 messages.",
      value: privateChat,
      onChange: setPrivateChat,
    },
    {
      label: "File transfer",
      description: "Allow hosts and participants to send files.",
      value: fileTransfer,
      onChange: setFileTransfer,
    },
    {
      label: "Automated captions",
      description: "Show real-time transcription during meetings.",
      value: transcript,
      onChange: setTranscript,
    },
    {
      label: "Meeting reactions",
      description: "Allow emoji reactions in meetings.",
      value: reactions,
      onChange: setReactions,
    },
    {
      label: "Non-verbal feedback",
      description: "Raise hand, clap, thumbs up during meetings.",
      value: nonverbal,
      onChange: setNonverbal,
    },
    {
      label: "Attention tracking",
      description: "Show host if participants switch focus.",
      value: attention,
      onChange: setAttention,
    },
  ];

  const recordingSettings: SettingRowProps[] = [
    {
      label: "Cloud recording",
      description: "Record meetings to the cloud automatically.",
      value: cloudRecord,
      onChange: setCloudRecord,
    },
    {
      label: "Automatic recording",
      description: "Record meetings as soon as they start.",
      value: autoRecord,
      onChange: setAutoRecord,
    },
    {
      label: "Record chat messages from the meeting",
      value: recordChat,
      onChange: setRecordChat,
    },
  ];

  const avSettings: SettingRowProps[] = [
    {
      label: "Stereo audio",
      description: "Enable stereo audio during meetings.",
      value: stereo,
      onChange: setStereo,
    },
    {
      label: "Original sound for musicians",
      description: "Disable noise suppression for music.",
      value: originalSound,
      onChange: setOriginalSound,
    },
    {
      label: "HD video",
      description: "Send and receive video in high definition.",
      value: hd,
      onChange: setHd,
    },
    {
      label: "Mirror my video",
      description: "Mirror your video preview (only visible to you).",
      value: mirror,
      onChange: setMirror,
    },
    {
      label: "Virtual background",
      description: "Blur or replace your background.",
      value: virtualBg,
      onChange: setVirtualBg,
    },
  ];

  const sections = [
    { title: "Meeting", settings: meetingSettings },
    { title: "Recording", settings: recordingSettings },
    { title: "Audio & Video", settings: avSettings },
  ];

  return (
    <AppLayout>
      <div className="max-w-[760px] mx-auto p-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-6">Settings</h1>

        <div className="space-y-5">
          {sections.map((section) => (
            <div
              key={section.title}
              className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 bg-[#fafafa] border-b border-[#f5f5f5]">
                <h2 className="text-[14px] font-bold text-[#1a1a1a]">
                  {section.title}
                </h2>
              </div>
              <div className="px-6">
                {section.settings.map((s) => (
                  <SettingRow key={s.label} {...s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
