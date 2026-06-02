"use client";

import { useAppState } from "@/lib/hooks";
import { FalLogo } from "@/components/FalLogo";
import Stepper from "@/components/Stepper";
import PromptView from "@/components/PromptView";
import ImageView from "@/components/ImageView";
import ModelView from "@/components/ModelView";
import VoxelView from "@/components/VoxelView";

export default function Home() {
  const { state, generateImage, generate3D, goToVoxel, goToPhase, reset } = useAppState();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--border-color)" }}
      >
        <button
          onClick={reset}
          className="flex items-center gap-2.5"
          style={{ background: "none" }}
        >
          <FalLogo size={26} />
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Voxelizer
          </span>
        </button>
        <Stepper phase={state.phase} />
        <div style={{ width: 90 }} className="hidden sm:block" />
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        {state.phase === "prompt" && (
          <PromptView
            initialPrompt={state.prompt}
            initialAspect={state.aspectRatio}
            onGenerate={generateImage}
          />
        )}

        {state.phase === "image" && (
          <ImageView
            prompt={state.prompt}
            imageUrl={state.imageUrl}
            generating={state.imageGenerating}
            error={state.imageError}
            onGenerate3D={() => state.imageUrl && generate3D(state.imageUrl)}
            onBack={() => goToPhase("prompt")}
            onRetry={() => generateImage(state.prompt, state.aspectRatio)}
          />
        )}

        {state.phase === "model" && (
          <ModelView
            modelData={state.modelData}
            generating={state.modelGenerating}
            error={state.modelError}
            onVoxelize={goToVoxel}
            onBack={() => goToPhase("image")}
            onRetry={() => state.imageUrl && generate3D(state.imageUrl)}
          />
        )}

        {state.phase === "voxel" && state.modelData && (
          <VoxelView modelData={state.modelData} onBack={() => goToPhase("model")} />
        )}
      </main>

      <footer className="text-center py-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
        Nano Banana 2 · Hunyuan 3D 3.1 · powered by fal
      </footer>
    </div>
  );
}
