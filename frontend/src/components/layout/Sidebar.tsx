"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/studio", label: "Content Studio", icon: "auto_awesome" },
  { href: "/agent", label: "Agent", icon: "smart_toy" },
  { href: "/seeds", label: "Seed Bank", icon: "database" },
  { href: "/command-center", label: "Command Center", icon: "terminal" },
  { href: "/products", label: "Products", icon: "inventory_2" },
  { href: "/content", label: "Content", icon: "description" },
  { href: "/generate", label: "Generate", icon: "bolt" },
  { href: "/bulk-generate", label: "Bulk Ads", icon: "layers" },
  { href: "/optimizer", label: "Optimizer", icon: "speed" },
  { href: "/intelligence", label: "Intelligence", icon: "psychology" },
  { href: "/schedule", label: "Schedule", icon: "calendar_month" },
  { href: "/analytics", label: "Analytics", icon: "bar_chart" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <aside className="h-screen w-72 fixed left-0 top-0 z-40 glass-sidebar flex flex-col py-8 px-4 gap-2 border-r border-white/5 pt-24">
      {/* Brand Section */}
      <div className="px-4 mb-8 entrance-fade stagger-2">
        <div className="text-lg font-bold text-[#FF9500]">Precision Studio</div>
        <div className="text-[11px] uppercase tracking-[0.1em] font-medium text-[#E5E1E4]/40">
          Pro Plan
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-2">
        {navItems.map((item, index) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 group entrance-fade stagger-2 ${
                isActive
                  ? "bg-[#FF9500]/10 text-[#FF9500] border-r-2 border-[#FF9500] rounded-r-lg"
                  : "text-[#E5E1E4]/50 hover:text-[#E5E1E4] hover:bg-white/5 rounded-lg"
              }`}
              style={{ animationDelay: `${0.15 + index * 0.03}s` }}
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
      </nav>

      {/* Bottom Links */}
      <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-1 entrance-fade stagger-3">
        <Link
          href="#"
          className="flex items-center gap-3 px-4 py-2 text-[#E5E1E4]/50 hover:text-[#E5E1E4] transition-all duration-200 rounded-lg"
        >
          <span className="material-symbols-outlined">help</span>
          <span className="text-[11px] uppercase tracking-[0.1em] font-medium">
            Help
          </span>
        </Link>
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
    </aside>
  );
}
