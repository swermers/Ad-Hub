"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { api, type Product, type ContentPiece } from "@/lib/api";

function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 1200,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = eased * target;

      if (target % 1 !== 0) {
        setValue(parseFloat(current.toFixed(1)));
      } else {
        setValue(Math.floor(current));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const timer = setTimeout(() => requestAnimationFrame(animate), 300);
    return () => clearTimeout(timer);
  }, [target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {target % 1 !== 0 ? value.toFixed(1) : value}
      {suffix}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  suffix = "",
  trend,
  trendIcon,
  isPrimary = false,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: string;
  suffix?: string;
  trend: string;
  trendIcon: string;
  isPrimary?: boolean;
  delay?: number;
}) {
  return (
    <div
      className={`glass-card p-8 rounded-2xl relative overflow-hidden group entrance-fade stagger-3 ${
        isPrimary ? "border-b-2 border-[#FF9500]/20" : ""
      }`}
      style={{ animationDelay: `${0.15 + delay * 0.05}s` }}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity duration-300">
        <span className="material-symbols-outlined text-6xl">{icon}</span>
      </div>
      <div className="relative z-10">
        <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#c6c4df] mb-1">
          {label}
        </p>
        <h3
          className={`text-4xl font-bold mb-4 ${
            isPrimary ? "text-[#FF9500]" : "text-[#E5E1E4]"
          }`}
        >
          <AnimatedCounter target={value} suffix={suffix} />
        </h3>
        <div
          className={`flex items-center gap-2 text-sm font-bold ${
            isPrimary ? "text-[#FF9500]" : "text-[#ffbd7f]"
          }`}
        >
          <span className="material-symbols-outlined text-sm">{trendIcon}</span>
          <span>{trend}</span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "badge-draft",
    approved: "badge-approved",
    posted: "badge-posted",
    rejected: "badge-rejected",
    active: "badge-active",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
        styles[status] || "bg-white/10 text-[#E5E1E4]"
      }`}
    >
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [content, setContent] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listProducts(), api.listContent()])
      .then(([p, c]) => {
        setProducts(p);
        setContent(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#FF9500] animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF9500]">
            Loading Engine
          </span>
        </div>
      </div>
    );
  }

  const draftCount = content.filter((c) => c.status === "draft").length;
  const approvedCount = content.filter((c) => c.status === "approved").length;
  const approvedPct =
    content.length > 0 ? Math.round((approvedCount / content.length) * 100) : 0;

  return (
    <div className="relative">
      {/* Background Liquid Effects */}
      <div className="liquid-glow top-0 right-[-10%] opacity-40" />
      <div className="liquid-glow-secondary bottom-[20%] left-[5%] opacity-30" />
      <div className="liquid-glow-tertiary top-[40%] right-[30%] opacity-20" />

      {/* Header Section */}
      <header className="mb-16 entrance-fade stagger-2">
        <div className="flex items-end justify-between">
          <div>
            <span className="uppercase tracking-[0.2em] text-[#FF9500] font-bold text-xs mb-4 block">
              Performance Overview
            </span>
            <h1 className="text-6xl font-extrabold tracking-tighter text-[#E5E1E4] leading-none">
              Command Center
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-[#dbc2ad] text-sm">
              Last sync: 2 minutes ago
            </span>
            <div className="flex gap-2 items-center">
              <span className="w-2 h-2 rounded-full bg-[#FF9500] animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF9500]">
                Live Engine
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Bento Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
        <StatCard
          label="Products"
          value={products.length}
          icon="inventory_2"
          trend="+12% this month"
          trendIcon="trending_up"
          delay={0}
        />
        <StatCard
          label="Total Content"
          value={content.length}
          icon="description"
          trend="Optimized by AI"
          trendIcon="bolt"
          delay={1}
        />
        <StatCard
          label="Drafts"
          value={draftCount}
          icon="edit_note"
          trend="Pending Review"
          trendIcon="schedule"
          delay={2}
        />
        <StatCard
          label="Approved"
          value={approvedPct}
          suffix="%"
          icon="verified"
          trend="Quality Threshold Met"
          trendIcon="check_circle"
          isPrimary
          delay={3}
        />
      </section>

      {/* Recent Content Section */}
      <section>
        <div className="flex items-center justify-between mb-10 entrance-fade stagger-4">
          <h2 className="text-3xl font-bold tracking-tight text-[#E5E1E4]">
            Recent Content
          </h2>
          <Link
            href="/content"
            className="text-[#FF9500] font-bold hover:underline flex items-center gap-2 transition-transform hover:translate-x-2 duration-200"
          >
            View Library
            <span className="material-symbols-outlined text-sm">
              arrow_forward
            </span>
          </Link>
        </div>

        {content.length === 0 ? (
          <div className="glass-card-subtle p-12 rounded-3xl text-center entrance-fade stagger-4">
            <span className="material-symbols-outlined text-5xl text-[#FF9500]/40 mb-4 block">
              auto_awesome
            </span>
            <h3 className="text-xl font-bold mb-2">No content yet</h3>
            <p className="text-[#dbc2ad] mb-6">
              Start generating content to see it here.
            </p>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 bg-[#FF9500] text-[#2d1600] px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all haptic-btn"
            >
              <span className="material-symbols-outlined text-sm">bolt</span>
              Generate Content
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {content.slice(0, 6).map((piece, index) => (
              <Link
                key={piece.id}
                href={`/content/${piece.id}`}
                className="content-prism rounded-3xl overflow-hidden group entrance-fade stagger-4"
                style={{ animationDelay: `${0.35 + index * 0.05}s` }}
              >
                {/* Card Header with gradient */}
                <div className="h-48 relative overflow-hidden bg-gradient-to-br from-[#201f21] to-[#2a2a2c]">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131315]/80 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-7xl text-white/5 group-hover:text-white/10 group-hover:scale-110 transition-all duration-500">
                      {piece.content_type === "video" ? "play_circle" : "article"}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-6">
                    <StatusBadge status={piece.status} />
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-8">
                  <h4 className="text-xl font-bold mb-2 group-hover:text-[#FF9500] transition-colors duration-200 truncate">
                    {piece.title || "Untitled"}
                  </h4>
                  <p className="text-[#dbc2ad] text-sm leading-relaxed line-clamp-2 mb-6">
                    {piece.content_type} &middot; {piece.platform}
                  </p>
                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full border-2 border-[#131315] bg-[#201f21] flex items-center justify-center text-[10px] font-bold hover:z-10 transition-transform hover:scale-125 duration-200 cursor-pointer">
                        AI
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#dbc2ad]">
                      {new Date(piece.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Dynamic Utility Section */}
      <section className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="glass-card p-10 rounded-[2rem] border-l-4 border-[#FF9500]/40 entrance-fade stagger-5">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[#FF9500]/10 flex items-center justify-center shrink-0 group">
              <span className="material-symbols-outlined text-[#FF9500] text-3xl group-hover:rotate-12 transition-transform duration-200">
                auto_awesome
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-3">AI Optimizer Active</h3>
              <p className="text-[#dbc2ad] mb-6 leading-relaxed">
                The engine is currently analyzing your campaigns for visual
                consistency and performance optimization.
              </p>
              <div className="w-full bg-[#201f21] h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-[#FF9500] h-full animate-progress shadow-[0_0_12px_rgba(255,149,0,0.5)]"
                  style={{ width: "68%" }}
                />
              </div>
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-[#FF9500]">
                <span>Analysis Progress</span>
                <span>68%</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="glass-card p-10 rounded-[2rem] border-l-4 border-[#c6c4df]/40 entrance-fade stagger-5"
          style={{ animationDelay: "0.35s" }}
        >
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[#c6c4df]/10 flex items-center justify-center shrink-0 group">
              <span className="material-symbols-outlined text-[#c6c4df] text-3xl group-hover:scale-110 transition-transform duration-200">
                bolt
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-3">Content Velocity</h3>
              <p className="text-[#dbc2ad] mb-6 leading-relaxed">
                Your content generation speed is optimized. Keep creating
                high-quality content at scale.
              </p>
              <Link
                href="/analytics"
                className="inline-block bg-[#c6c4df]/10 hover:bg-[#c6c4df]/20 text-[#c6c4df] border border-[#c6c4df]/20 px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all hover:tracking-[0.15em] hover-lift"
              >
                View Report
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <Link
        href="/generate"
        className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-[#FF9500] text-[#2d1600] shadow-[0_0_40px_rgba(255,149,0,0.3)] hover:scale-110 active:scale-90 transition-all duration-200 flex items-center justify-center z-50 group overflow-hidden entrance-fade"
        style={{ animationDelay: "0.6s" }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#ffbd7f] to-white opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
        <span className="material-symbols-outlined text-3xl font-bold group-hover:rotate-90 transition-transform duration-300">
          add
        </span>
      </Link>
    </div>
  );
}
