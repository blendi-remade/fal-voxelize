"use client";

import { FalSpinner } from "./FalLogo";

export default function Loading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="loading animate-fade-in">
      <FalSpinner size={56} />
      <div className="loading-text">
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {title}
        </p>
        {subtitle && <p className="mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
