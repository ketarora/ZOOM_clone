"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { ExternalLink } from "lucide-react";

export default function ProfilePage() {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <AppLayout>
      <div className="p-6 max-w-[900px] mx-auto">
        {/* Privacy banner */}
        {showBanner && (
          <div className="flex items-start gap-3 bg-[#eef5ff] border border-[#c5d8ff] rounded-xl px-5 py-4 mb-6">
            <span className="text-[#0b6bde] text-lg shrink-0 mt-0.5">ℹ️</span>
            <p className="text-[13px] text-[#333] flex-1 leading-relaxed">
              When you join meetings, webinars, chats or channels hosted on
              Zoom, your profile information, including your name and profile
              picture, may be visible to other participants or members. Your
              name and email address will also be visible to the{" "}
              <span className="text-[#0b6bde] hover:underline cursor-pointer">
                account owner
              </span>{" "}
              and host when you join meetings or channels on their account.
            </p>
            <button
              onClick={() => setShowBanner(false)}
              className="text-[#888] hover:text-[#333] transition-colors shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm p-8 mb-5">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-xl bg-[#E05B2B] flex items-center justify-center text-white text-4xl font-bold shrink-0">
              K
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h1 className="text-2xl font-bold text-[#1a1a1a]">
                    Ketan Arora
                  </h1>
                  <p className="text-[13px] text-[#888] mt-0.5">
                    ketan.arora019@gmail.com
                  </p>
                </div>
                <button className="text-[13px] text-[#0b6bde] hover:underline font-medium">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Personal information */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-[#f5f5f5] bg-[#fafafa]">
            <h2 className="text-[13px] font-semibold text-[#1a1a1a]">
              Personal Information
            </h2>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            {[
              {
                label: "Display Name",
                value: "Ketan Arora",
                action: null,
              },
              {
                label: "Email",
                value: "ketan.arora019@gmail.com",
                action: null,
              },
              {
                label: "Phone",
                value: null,
                placeholder: "Not set",
                action: "Add",
              },
              {
                label: "My direct chat link",
                value: "https://zoom.us/launch/chat?email=ketan.arora019@gmail.com",
                isLink: true,
                action: null,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-8">
                  <span className="w-40 text-[13px] font-medium text-[#555] shrink-0">
                    {row.label}
                  </span>
                  {row.value ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={[
                          "text-[13px]",
                          row.isLink
                            ? "text-[#0b6bde] hover:underline cursor-pointer truncate max-w-xs"
                            : "text-[#1a1a1a]",
                        ].join(" ")}
                      >
                        {row.value}
                      </span>
                      {row.isLink && (
                        <ExternalLink size={12} className="text-[#0b6bde]" />
                      )}
                    </div>
                  ) : (
                    <span className="text-[13px] text-[#aaa]">
                      {row.placeholder}
                    </span>
                  )}
                </div>
                {row.action && (
                  <button className="text-[13px] text-[#0b6bde] hover:underline font-medium">
                    {row.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-[#f5f5f5] bg-[#fafafa]">
            <h2 className="text-[13px] font-semibold text-[#1a1a1a]">Plan</h2>
          </div>
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold text-[#1a1a1a]">
                Zoom Workplace Basic
              </p>
              <p className="text-[12px] text-[#888] mt-0.5">
                Free plan · Up to 40 min per meeting
              </p>
            </div>
            <button className="flex items-center gap-1.5 bg-[#0b6bde] text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-[#0047cc] transition-colors">
              Upgrade to Pro
            </button>
          </div>
        </div>

        {/* Sign In */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f5f5f5] bg-[#fafafa]">
            <h2 className="text-[13px] font-semibold text-[#1a1a1a]">
              Sign In
            </h2>
          </div>
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#4285F4] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#1a1a1a]">Google</p>
                <p className="text-[12px] text-[#888]">
                  ketan.arora019@gmail.com
                </p>
              </div>
            </div>
            <span className="text-[12px] text-[#16a34a] font-semibold">
              Connected
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
