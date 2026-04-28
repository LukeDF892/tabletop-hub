"use client";

import type { LucideIcon } from "lucide-react";
import { BookOpen } from "lucide-react";

interface HubCardProps {
  title: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  accentColor: string;
  glowColor: string;
  borderColor: string;
  tagColor: string;
  gradient?: string;
  comingSoon?: boolean;
}

export default function HubCard({
  title,
  description,
  badge,
  icon: Icon,
  accentColor,
  glowColor,
  borderColor,
  tagColor,
  gradient,
  comingSoon,
}: HubCardProps) {
  return (
    <div
      className="group relative rounded-2xl p-7 flex flex-col gap-5 transition-all duration-300"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-card)",
        backgroundImage: gradient,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = borderColor;
        el.style.boxShadow = `0 0 30px ${glowColor}, 0 16px 32px rgba(0,0,0,0.3)`;
        el.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border-card)";
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0)";
      }}
    >
      {comingSoon && (
        <div
          className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-medium border"
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.1)",
            color: "var(--text-muted)",
          }}
        >
          Coming soon
        </div>
      )}

      {/* Badge */}
      <div
        className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
        style={{
          backgroundColor: tagColor,
          borderColor: borderColor,
          color: accentColor,
        }}
      >
        <BookOpen size={10} />
        {badge}
      </div>

      {/* Icon */}
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: tagColor, border: `1px solid ${borderColor}` }}
      >
        <Icon size={24} style={{ color: accentColor }} />
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2 flex-1">
        <h2
          className="font-cinzel text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </div>

      {/* CTA */}
      {comingSoon && (
        <div className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Coming soon
        </div>
      )}
    </div>
  );
}
