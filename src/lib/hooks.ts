"use client";

import { useState, useCallback, useRef } from "react";
import type { AppState, ImageResult, ModelResult } from "./types";

const POLL_INTERVAL = 3000;

const initialState: AppState = {
  phase: "prompt",
  prompt: "",
  aspectRatio: "1:1",
  imageUrl: null,
  imageGenerating: false,
  imageError: null,
  modelData: null,
  modelGenerating: false,
  modelError: null,
};

async function pollUntilDone<T>(
  requestId: string,
  endpoint: string,
  ref: { current: ReturnType<typeof setInterval> | null }
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (ref.current) clearInterval(ref.current);
    ref.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/fal-status?requestId=${requestId}&endpoint=${encodeURIComponent(endpoint)}`
        );
        const data = await res.json();
        if (data.error) {
          if (ref.current) clearInterval(ref.current);
          reject(new Error(data.error));
          return;
        }
        if (data.status === "COMPLETED") {
          if (ref.current) clearInterval(ref.current);
          resolve(data.result as T);
        }
      } catch {
        // transient; keep polling
      }
    }, POLL_INTERVAL);
  });
}

export function useAppState() {
  const [state, setState] = useState<AppState>(initialState);
  const imagePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modelPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateState = useCallback(
    (updates: Partial<AppState>) => setState((prev) => ({ ...prev, ...updates })),
    []
  );

  const generateImage = useCallback(
    async (prompt: string, aspectRatio: string) => {
      updateState({
        phase: "image",
        prompt,
        aspectRatio,
        imageGenerating: true,
        imageError: null,
        imageUrl: null,
      });
      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, aspect_ratio: aspectRatio, resolution: "1K" }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { request_id, endpoint } = await res.json();
        const result = await pollUntilDone<ImageResult>(request_id, endpoint, imagePollRef);
        const url = result.images?.[0]?.url;
        if (!url) throw new Error("No image returned");
        updateState({ imageUrl: url, imageGenerating: false });
      } catch (err: unknown) {
        updateState({
          imageGenerating: false,
          imageError: err instanceof Error ? err.message : "Image generation failed",
        });
      }
    },
    [updateState]
  );

  const generate3D = useCallback(
    async (imageUrl: string) => {
      updateState({
        phase: "model",
        modelGenerating: true,
        modelError: null,
        modelData: null,
      });
      try {
        const res = await fetch("/api/generate-3d", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: imageUrl }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { request_id, endpoint } = await res.json();
        const result = await pollUntilDone<ModelResult>(request_id, endpoint, modelPollRef);
        if (!result.model_urls?.obj?.url && !result.model_glb?.url) {
          throw new Error("No model returned");
        }
        updateState({ modelData: result, modelGenerating: false });
      } catch (err: unknown) {
        updateState({
          modelGenerating: false,
          modelError: err instanceof Error ? err.message : "3D generation failed",
        });
      }
    },
    [updateState]
  );

  const goToVoxel = useCallback(() => updateState({ phase: "voxel" }), [updateState]);
  const goToPhase = useCallback(
    (phase: AppState["phase"]) => updateState({ phase }),
    [updateState]
  );
  const reset = useCallback(() => {
    if (imagePollRef.current) clearInterval(imagePollRef.current);
    if (modelPollRef.current) clearInterval(modelPollRef.current);
    setState(initialState);
  }, []);

  return { state, generateImage, generate3D, goToVoxel, goToPhase, reset, updateState };
}
