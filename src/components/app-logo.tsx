import React from "react";
import clsx from "clsx";

export function AppLogo({
  size = 36,
  className = "",
  withGlow = true,
}: {
  size?: number;
  className?: string;
  withGlow?: boolean;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={clsx(
        "relative inline-grid shrink-0 place-items-center select-none transition-transform group-hover:scale-105",
        className,
      )}
    >
      {withGlow && (
        <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-emerald-500/25 to-[#a3ff12]/30 blur-md -z-10" />
      )}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full drop-shadow-sm"
      >
        <defs>
          <linearGradient id="logoTop" x1="24" y1="6" x2="24" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a3ff12" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="logoLeft" x1="10" y1="19" x2="24" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10b981" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="logoRight" x1="38" y1="19" x2="24" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#059669" />
            <stop offset="1" stopColor="#064e3b" />
          </linearGradient>
        </defs>

        {/* Ambient Subtle Base */}
        <rect width="48" height="48" rx="14" fill="#0b1728" />
        <rect width="46" height="46" x="1" y="1" rx="13" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {/* Financial Diamond Gem Facets */}
        <g transform="translate(0, 0)">
          {/* Top Facet */}
          <polygon points="24,8 37,18 24,23 11,18" fill="url(#logoTop)" />
          {/* Left Facet */}
          <polygon points="11,18 24,23 24,39" fill="url(#logoLeft)" />
          {/* Right Facet */}
          <polygon points="37,18 24,23 24,39" fill="url(#logoRight)" />

          {/* Upward Growth Arrow Vector */}
          <polyline
            points="18.5,26.5 24,21 29.5,26.5"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="24"
            y1="21"
            x2="24"
            y2="33"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Apex Core Jewel */}
          <circle cx="24" cy="13" r="1.8" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}
