"use client";

import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import MiniMeetingWindow from "../meeting/MiniMeetingWindow";
import { getActiveMeetingId } from "@/lib/activeMeeting";
import { useMe } from "@/lib/hooks";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export default function AppLayout({
  children,
  hideSidebar = false,
}: AppLayoutProps) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [miniHidden, setMiniHidden] = useState(false);

  // Re-read presence on every navigation (room writes/clears localStorage).
  useEffect(() => {
    setActiveId(getActiveMeetingId());
    setMiniHidden(false);
  }, [pathname]);

  useEffect(() => {
    const sync = () => setActiveId(getActiveMeetingId());
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const inRoom = pathname?.startsWith("/room/") ?? false;
  const showMini = !!activeId && !inRoom && !miniHidden;

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5] overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        {!hideSidebar && <Sidebar />}
        <main className="flex-1 overflow-auto bg-[#F5F5F5]">{children}</main>
      </div>
      {showMini && (
        <MiniMeetingWindow
          meetingId={activeId!}
          displayName={me?.displayName ?? "You"}
          onHide={() => setMiniHidden(true)}
        />
      )}
    </div>
  );
}
