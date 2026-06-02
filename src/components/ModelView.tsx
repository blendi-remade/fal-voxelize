"use client";

import ModelViewer from "./ModelViewer";
import Loading from "./Loading";
import type { ModelResult } from "@/lib/types";

interface Props {
  modelData: ModelResult | null;
  generating: boolean;
  error: string | null;
  onVoxelize: () => void;
  onBack: () => void;
  onRetry: () => void;
}

export default function ModelView({
  modelData,
  generating,
  error,
  onVoxelize,
  onBack,
  onRetry,
}: Props) {
  const glbUrl = modelData?.model_glb?.url || modelData?.model_urls?.glb?.url;

  return (
    <div className="max-w-3xl w-full animate-fade-in">
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          padding: "1.5rem",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              3D model
            </h2>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Hunyuan 3D 3.1 Pro · drag to orbit, scroll to zoom
            </p>
          </div>
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
            ← Back to image
          </button>
        </div>

        {generating ? (
          <div style={{ minHeight: "50vh" }} className="flex items-center justify-center">
            <Loading
              title="Reconstructing geometry…"
              subtitle="Hunyuan 3D usually takes 1 to 3 minutes"
            />
          </div>
        ) : error ? (
          <div className="text-center py-12">
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
        ) : glbUrl ? (
          <>
            <div
              style={{
                height: "55vh",
                borderRadius: 8,
                overflow: "hidden",
                background: "radial-gradient(circle at 50% 30%, #1a1a20, #0a0a0b)",
                border: "1px solid var(--border-color)",
              }}
            >
              <ModelViewer url={glbUrl} />
            </div>
            <button
              onClick={onVoxelize}
              className="w-full mt-4 py-2.5 text-sm font-medium transition-all duration-150"
              style={{
                background: "var(--fal-cyan)",
                color: "white",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fal-blue-light)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--fal-cyan)")}
            >
              Voxelize →
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
