"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GettingStarted } from "@/components/GettingStarted";
import { clearToken } from "@/lib/api";

const navSections = [
  {
    label: "Create",
    items: [
      { href: "/studio", label: "Content Studio", icon: "auto_awesome" },
      { href: "/seeds", label: "Seed Bank", icon: "database" },
      { href: "/content", label: "Content Library", icon: "library_books" },
      { href: "/queue", label: "Content Queue", icon: "view_kanban" },
      { href: "/generate", label: "Quick Generate", icon: "bolt" },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/", label: "Dashboard", icon: "dashboard" },
      { href: "/products", label: "Products", icon: "inventory_2" },
      { href: "/brand-profile", label: "Brand & Voice", icon: "palette" },
      { href: "/style-guides", label: "Style Guides", icon: "menu_book" },
      { href: "/schedule", label: "Schedule", icon: "calendar_month" },
      { href: "/analytics", label: "Analytics", icon: "bar_chart" },
      { href: "/intelligence", label: "Intelligence", icon: "psychology" },
    ],
  },
  {
    label: "Ads & Campaigns",
    items: [
      { href: "/bulk-generate", label: "Bulk Ads", icon: "layers" },
      { href: "/optimizer", label: "Optimizer", icon: "speed" },
      { href: "/command-center", label: "Command Center", icon: "terminal" },
      { href: "/agent", label: "Agent", icon: "smart_toy" },
    ],
  },
  {
    label: null,
    items: [
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [guideOpen, setGuideOpen] = useState(false);

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  return (
    <aside
      className={`h-screen w-72 fixed left-0 top-0 z-40 glass-sidebar flex flex-col py-6 md:py-8 px-4 gap-2 border-r border-white/5 pt-20 md:pt-24 transition-transform duration-300 ease-out ${
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      {/* Close button - mobile only */}
      <button
        onClick={onClose}
        className="md:hidden absolute top-5 right-3 p-1.5 text-[#E5E1E4]/50 hover:text-[#E5E1E4] hover:bg-white/10 rounded-lg transition-all"
        aria-label="Close menu"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>

      {/* Brand Section */}
      <div className="px-4 mb-6 md:mb-8 entrance-fade stagger-2">
        <div className="text-lg font-bold text-[#FF9500]">Iterant</div>
        <div className="text-[11px] uppercase tracking-[0.1em] font-medium text-[#E5E1E4]/40">
          Content Engine
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-3 md:space-y-4 overflow-y-auto pr-2 -mr-2">
        {navSections.map((section, sectionIdx) => {
          let itemCounter = 0;
          return (
            <div key={sectionIdx}>
              {section.label && (
                <div
                  className="px-4 pt-2 pb-1 entrance-fade stagger-2"
                  style={{ animationDelay: `${0.1 + sectionIdx * 0.06}s` }}
                >
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#E5E1E4]/25">
                    {section.label}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  itemCounter++;
                  const globalIndex = sectionIdx * 10 + itemCounter;
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-all duration-200 group entrance-fade stagger-2 ${
                        isActive
                          ? "bg-[#FF9500]/10 text-[#FF9500] border-r-2 border-[#FF9500] rounded-r-lg"
                          : "text-[#E5E1E4]/50 hover:text-[#E5E1E4] hover:bg-white/5 rounded-lg"
                      }`}
                      style={{ animationDelay: `${0.15 + globalIndex * 0.025}s` }}
                    >
                      <span
                        className={`material-symbols-outlined text-xl ${
                          isActive ? "" : "group-hover:text-[#FF9500] transition-colors duration-200"
                        }`}
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {item.icon}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.1em] font-medium">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Links */}
      <div className="mt-auto pt-6 md:pt-8 border-t border-white/5 flex flex-col gap-1 entrance-fade stagger-3">
        {/* New Product - mobile only (hidden in top nav on small screens) */}
        <Link
          href="/products/new"
          className="sm:hidden flex items-center gap-3 px-4 py-2 text-[#FF9500] hover:bg-[#FF9500]/10 transition-all duration-200 rounded-lg w-full text-left"
        >
          <span className="material-symbols-outlined">add_circle</span>
          <span className="text-[11px] uppercase tracking-[0.1em] font-medium">
            New Product
          </span>
        </Link>
        <button
          onClick={() => setGuideOpen(true)}
          className="flex items-center gap-3 px-4 py-2 text-[#E5E1E4]/50 hover:text-[#E5E1E4] transition-all duration-200 rounded-lg w-full text-left"
        >
          <span className="material-symbols-outlined">rocket_launch</span>
          <span className="text-[11px] uppercase tracking-[0.1em] font-medium">
            Getting Started
          </span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 text-[#E5E1E4]/50 hover:text-[#ffb4ab] transition-all duration-200 rounded-lg w-full text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-[11px] uppercase tracking-[0.1em] font-medium">
            Logout
          </span>
        </button>
      </div>

      <GettingStarted open={guideOpen} onClose={() => setGuideOpen(false)} />
    </aside>
  );
}
