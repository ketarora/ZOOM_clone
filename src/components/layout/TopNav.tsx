"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, ChevronDown } from "lucide-react";

export default function TopNav() {
  const router = useRouter();

  return (
    <div className="shrink-0 sticky top-0 z-40">
      {/* Utility bar — dark navy */}
      <div
        className="h-[34px] flex items-center justify-end px-6 space-x-6 text-[12px] font-normal text-white/90"
        style={{ backgroundColor: "#00053d" }}
      >
        <button className="flex items-center hover:text-white transition-colors">
          <Search size={13} className="mr-1.5" />
          Search
        </button>
        <button className="hover:text-white transition-colors">Support</button>
        <button className="hover:text-white transition-colors">0008000503335</button>
        <div className="h-3 w-px bg-white/20" />
        <button className="hover:text-white transition-colors">Contact Sales</button>
        <button className="hover:text-white transition-colors">Request a Demo</button>
        <div className="h-3 w-px bg-white/20" />
        <button className="p-1 hover:text-white transition-colors">
          <ShoppingCart size={15} />
        </button>
      </div>

      {/* Main nav bar — white */}
      <div className="h-[64px] bg-white border-b border-gray-100 flex items-center justify-between px-6 shadow-sm">
        {/* Left: logo + nav links */}
        <div className="flex items-center space-x-10">
          <Link href="/">
            <span className="text-[#0b6bde] font-bold text-[26px] tracking-tight cursor-pointer select-none">
              zoom
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8 text-[14px] font-medium text-[#747487]">
            {["Products", "Solutions", "Resources", "Plans & Pricing"].map(
              (item) => (
                <button
                  key={item}
                  className="flex items-center gap-0.5 hover:text-[#0b6bde] transition-colors"
                >
                  {item}
                  <ChevronDown size={13} className="ml-0.5 text-[#999]" />
                </button>
              )
            )}
          </nav>
        </div>

        {/* Right: actions + avatar */}
        <div className="flex items-center space-x-6 text-[14px] font-medium text-[#747487]">
          <button
            onClick={() => router.push("/schedule")}
            className="hover:text-[#0b6bde] transition-colors font-semibold"
          >
            Schedule
          </button>
          <button
            onClick={() => router.push("/join")}
            className="hover:text-[#0b6bde] transition-colors font-semibold"
          >
            Join
          </button>
          <button className="flex items-center hover:text-[#0b6bde] transition-colors font-semibold">
            Host <ChevronDown size={13} className="ml-1 text-[#999]" />
          </button>
          <button className="flex items-center hover:text-[#0b6bde] transition-colors font-semibold">
            Web App <ChevronDown size={13} className="ml-1 text-[#999]" />
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="w-8 h-8 rounded-full bg-[#E05B2B] text-white text-sm font-bold flex items-center justify-center hover:opacity-90 transition-opacity"
            title="Profile"
          >
            K
          </button>
        </div>
      </div>
    </div>
  );
}
