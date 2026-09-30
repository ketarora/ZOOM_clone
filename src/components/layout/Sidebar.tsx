"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, ExternalLink, ShieldCheck } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  badge?: string;
  external?: boolean;
}

const mainItems: NavItem[] = [{ label: "Home", href: "/" }];

const productItems: NavItem[] = [
  { label: "Meetings", href: "/meetings" },
  { label: "Scheduler", href: "/schedule" },
];
// Zoom lists many products; the rest are shown disabled so the demo never
// lands on a 404. They unlock as routes are implemented.
const soonItems: string[] = [
  "Recordings",
  "Hub",
  "Whiteboards",
  "Notes",
  "Clips",
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  return (
    <Link href={item.href}>
      <div
        className={[
          "flex items-center justify-between px-4 py-[5px] text-[14px] rounded-[12px] mx-1 cursor-pointer transition-colors mb-[1px] select-none",
          isActive
            ? "bg-[#eef5ff] text-[#0b6bde] font-semibold"
            : "text-[#222325] hover:bg-[#e7e7eb] font-normal",
        ].join(" ")}
        style={{ minHeight: "32px" }}
      >
        <span>{item.label}</span>
        <div className="flex items-center gap-1">
          {item.badge && (
            <span className="text-[11px] font-bold text-[#0b6bde] bg-[#eef5ff] border border-[#bdd8ff] px-1 rounded-full leading-none">
              {item.badge}
            </span>
          )}
          {item.external && (
            <ExternalLink size={13} className="text-[#aaa]" />
          )}
        </div>
      </div>
    </Link>
  );
}

function ExpandItem({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-4 py-[5px] text-[14px] text-[#222325] hover:bg-[#e7e7eb] rounded-[12px] mx-1 cursor-pointer transition-colors mb-[1px]"
        style={{ minHeight: "32px" }}
        onClick={() => setOpen(!open)}
      >
        <ChevronRight
          size={14}
          className={[
            "text-[#aaa] transition-transform",
            open ? "rotate-90" : "",
          ].join(" ")}
        />
        <span>{label}</span>
      </div>
      {open && label === "My Account" && (
        <div className="pl-8">
          <Link href="/profile">
            <div className="px-4 py-[5px] text-[13px] text-[#333] hover:bg-[#e7e7eb] rounded-[12px] mx-1 cursor-pointer">
              Profile
            </div>
          </Link>
          <Link href="/settings">
            <div className="px-4 py-[5px] text-[13px] text-[#333] hover:bg-[#e7e7eb] rounded-[12px] mx-1 cursor-pointer">
              Settings
            </div>
          </Link>
        </div>
      )}
      {open && label === "Support" && (
        <div className="pl-8">
          <a
            href="https://support.zoom.us"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="px-4 py-[5px] text-[13px] text-[#0b6bde] hover:bg-[#e7e7eb] rounded-[12px] mx-1 cursor-pointer">
              Help Center
            </div>
          </a>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  return (
    <div className="hidden md:flex w-[280px] h-full flex-col bg-white border-r border-[#ebebeb] shrink-0 overflow-y-auto">
      {/* Home */}
      <div className="pt-4 pb-1 px-2">
        {mainItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* My Products */}
      <div className="pb-1 px-2">
        <p className="px-4 py-2 text-[12px] font-medium text-[#696f79] tracking-normal">
          My Products
        </p>
        {productItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
        {soonItems.map((label) => (
          <div
            key={label}
            title="Coming soon"
            className="flex items-center justify-between px-4 py-[5px] text-[14px] rounded-[12px] mx-1 mb-[1px] select-none text-[#a0a0a8] cursor-not-allowed"
            style={{ minHeight: "32px" }}
          >
            <span>{label}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#b5b5bd] bg-[#f1f1f4] px-1.5 py-0.5 rounded-full">
              Soon
            </span>
          </div>
        ))}
        <div className="px-4 pt-1 pb-3">
          <button className="text-[13px] text-[#0b6bde] hover:underline font-medium">
            Discover More Products
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#ebebeb] mx-4" />

      {/* Account section */}
      <div className="pt-1 pb-4 px-2">
        <ExpandItem label="My Account" />
        <ExpandItem label="Admin" />
        <ExpandItem label="Support" />
      </div>

      {/* Shield at bottom */}
      <div className="mt-auto px-5 pb-5">
        <div className="w-9 h-9 bg-[#0b6bde] rounded-lg flex items-center justify-center text-white shadow-sm cursor-pointer hover:bg-[#0047cc] transition-colors">
          <ShieldCheck size={20} />
        </div>
      </div>
    </div>
  );
}
