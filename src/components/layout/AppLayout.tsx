import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export default function AppLayout({
  children,
  hideSidebar = false,
}: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5] overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        {!hideSidebar && <Sidebar />}
        <main className="flex-1 overflow-auto bg-[#F5F5F5]">{children}</main>
      </div>
    </div>
  );
}
