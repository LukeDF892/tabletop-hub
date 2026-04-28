"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface GameCardProps {
  href: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  accentColor: string;
  glowColor: string;
  borderColor: string;
  tagColor: string;
  tagText: string;
  gradient: string;
}

export default function GameCard({
  href,
  title,
  subtitle,
  description,
  badge,
  icon: Icon,
  accentColor,
  glowColor,
  borderColor,
  tagColor,
  tagText,
  gradient,
}: GameCardProps) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl p-8 flex flex-col gap-6 transition-all duration-300"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-card)",
        backgroundImage: gradient,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = borderColor;
        el.style.boxShadow = `0 0 40px ${glowColor}, 0 20px 40px rgba(0,0,0,0.4)`;
        el.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border-card)";
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Badge */}
      <div className="flex items-start justify-between">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
          style={{
            backgroundColor: tagColor,
            borderColor: borderColor,
            color: tagText,
          }}
        >
          <Icon size={11} />
          {badge}
        </div>
      </div>

      {/* Icon */}
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: tagColor, border: `1px solid ${borderColor}` }}
      >
        <Icon size={32} style={{ color: accentColor }} />
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2 flex-1">
        <p
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: accentColor }}
        >
          {subtitle}
        </p>
        <h2
          className="font-cinzel text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </div>

      {/* CTA */}
      <div
        className="flex items-center gap-2 text-sm font-medium"
        style={{ color: accentColor }}
      >
        <span>Enter the Hub</span>
        <span className="transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}
