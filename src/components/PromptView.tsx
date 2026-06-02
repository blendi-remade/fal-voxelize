"use client";

import { useState } from "react";

const ASPECT_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16"];

const EXAMPLES = [
  "a cute baby dragon, chunky stylized game character, vibrant colors, centered, plain background",
  "a grand fairytale castle with towers and flags, stylized game asset, vibrant colors, centered, plain background",
  "a glowing blue potion bottle, stylized game prop, centered, plain background",
  "a friendly orange fox, chunky stylized game character, centered, plain background",
  "a cozy mushroom house, isometric game asset, vibrant colors, plain background",
];

interface Props {
  initialPrompt: string;
  initialAspect: string;
  onGenerate: (prompt: string, aspectRatio: string) => void;
}

export default function PromptView({ initialPrompt, initialAspect, onGenerate }: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspect, setAspect] = useState(initialAspect || "1:1");

  const cardStyle = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: 12,
    padding: "1.75rem",
  };

  return (
    <div className="max-w-xl w-full animate-fade-in" style={cardStyle}>
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
          style={{ background: "var(--fal-purple-deep)" }}
        >
          1
        </div>
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Describe your object
        </h2>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
        Nano Banana 2 turns this into an image. Single, centered objects on plain
        backgrounds make the best 3D models.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="A cute robot toy, clean studio lighting, centered, white background..."
        rows={4}
        className="w-full resize-none text-sm mb-3"
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          padding: "0.75rem 1rem",
          color: "var(--text-primary)",
          outline: "none",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--fal-purple-light)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setPrompt(ex)}
            className="text-[11px] px-2 py-1 transition-colors duration-150"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              color: "var(--text-tertiary)",
            }}
          >
            {ex.split(",")[0]}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <label className="block mb-1.5 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Aspect ratio
        </label>
        <div className="flex gap-1.5">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r}
              onClick={() => setAspect(r)}
              className="text-xs px-3 py-1.5 transition-all duration-150"
              style={{
                background: aspect === r ? "var(--fal-purple-deep)" : "var(--bg-tertiary)",
                border: `1px solid ${aspect === r ? "var(--fal-purple-light)" : "var(--border-color)"}`,
                borderRadius: 6,
                color: aspect === r ? "#fff" : "var(--text-secondary)",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => prompt.trim() && onGenerate(prompt.trim(), aspect)}
        disabled={!prompt.trim()}
        className="w-full py-2.5 text-sm font-medium transition-all duration-150"
        style={{
          background: "var(--fal-purple-deep)",
          color: "white",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.15)",
          opacity: prompt.trim() ? 1 : 0.5,
          cursor: prompt.trim() ? "pointer" : "not-allowed",
        }}
        onMouseEnter={(e) => {
          if (prompt.trim()) e.currentTarget.style.background = "var(--fal-purple-light)";
        }}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--fal-purple-deep)")}
      >
        Generate Image
      </button>
    </div>
  );
}
