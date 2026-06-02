"use client";

import Loading from "./Loading";

interface Props {
  prompt: string;
  imageUrl: string | null;
  generating: boolean;
  error: string | null;
  onGenerate3D: () => void;
  onBack: () => void;
  onRetry: () => void;
}

export default function ImageView({
  prompt,
  imageUrl,
  generating,
  error,
  onGenerate3D,
  onBack,
  onRetry,
}: Props) {
  return (
    <div className="max-w-xl w-full animate-fade-in">
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          padding: "1.5rem",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Generated image
          </h2>
          <button
            onClick={onBack}
            className="text-xs px-2.5 py-1 transition-colors duration-150"
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              color: "var(--text-tertiary)",
            }}
          >
            ← New prompt
          </button>
        </div>

        {generating ? (
          <Loading title="Painting your image…" subtitle="Nano Banana 2 is generating" />
        ) : error ? (
          <div className="text-center py-8">
            <p
              className="text-xs p-3 mb-4"
              style={{
                background: "rgba(236,6,72,0.08)",
                border: "1px solid rgba(236,6,72,0.3)",
                borderRadius: 6,
                color: "var(--fal-red)",
              }}
            >
              {error}
            </p>
            <button
              onClick={onRetry}
              className="text-sm px-4 py-2"
              style={{ background: "var(--fal-purple-deep)", color: "#fff", borderRadius: 6 }}
            >
              Retry
            </button>
          </div>
        ) : imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={prompt}
              className="w-full object-contain"
              style={{
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                background: "var(--bg-tertiary)",
                maxHeight: "60vh",
              }}
            />
            <p className="text-xs mt-3 mb-4" style={{ color: "var(--text-tertiary)" }}>
              &ldquo;{prompt}&rdquo;
            </p>
            <button
              onClick={onGenerate3D}
              className="w-full py-2.5 text-sm font-medium transition-all duration-150"
              style={{
                background: "var(--fal-cyan)",
                color: "white",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fal-blue-light)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--fal-cyan)")}
            >
              Generate 3D Model →
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
