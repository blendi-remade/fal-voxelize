"use client";

import type { Phase } from "@/lib/types";

const STEPS: { key: Phase; label: string }[] = [
  { key: "prompt", label: "Prompt" },
  { key: "image", label: "Image" },
  { key: "model", label: "3D Model" },
  { key: "voxel", label: "Voxels" },
];

export default function Stepper({ phase }: { phase: Phase }) {
  const currentIdx = STEPS.findIndex((s) => s.key === phase);
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((s, i) => {
        const active = i === currentIdx;
        const done = i < currentIdx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200"
                style={{
                  background: active
                    ? "var(--fal-purple-deep)"
                    : done
                    ? "var(--fal-cyan)"
                    : "var(--bg-tertiary)",
                  color: active || done ? "#fff" : "var(--text-tertiary)",
                  border: `1px solid ${active ? "var(--fal-purple-light)" : "var(--border-color)"}`,
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline"
                style={{ color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-6 h-px"
                style={{ background: done ? "var(--fal-cyan)" : "var(--border-color)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
