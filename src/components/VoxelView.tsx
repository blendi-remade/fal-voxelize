"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import VoxelViewer from "./VoxelViewer";
import Loading from "./Loading";
import { loadMesh, voxelizeMesh, type MeshData } from "@/lib/voxelizer";
import { exportGLB, exportOBJ, exportVOX } from "@/lib/exporters";
import type { ModelResult, VoxelData } from "@/lib/types";

const MIN_RES = 12;
const MAX_RES = 200;
const DEFAULT_RES = 100;

interface Props {
  modelData: ModelResult;
  onBack: () => void;
}

export default function VoxelView({ modelData, onBack }: Props) {
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolution, setResolution] = useState(DEFAULT_RES);
  const [voxelData, setVoxelData] = useState<VoxelData | null>(null);
  const [computing, setComputing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const objUrl = modelData.model_urls?.obj?.url;
  const textureUrl = modelData.model_urls?.texture?.url;

  // Load mesh + texture once.
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    if (!objUrl) {
      setLoadError("No OBJ in model output");
      return;
    }
    loadMesh(objUrl, textureUrl)
      .then((m) => {
        if (!cancelled) setMesh(m);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load mesh");
      });
    return () => {
      cancelled = true;
    };
  }, [objUrl, textureUrl]);

  const recompute = useCallback(
    (m: MeshData, res: number) => {
      setComputing(true);
      // Defer so the spinner can paint before the (synchronous) voxelization.
      setTimeout(() => {
        try {
          const data = voxelizeMesh(m, res);
          setVoxelData(data);
        } finally {
          setComputing(false);
        }
      }, 20);
    },
    []
  );

  // Initial voxelization once mesh is ready.
  useEffect(() => {
    if (mesh) recompute(mesh, resolution);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesh]);

  const onSlider = (res: number) => {
    setResolution(res);
    if (!mesh) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => recompute(mesh, res), 250);
  };

  const download = async (kind: "glb" | "obj" | "vox") => {
    if (!voxelData) return;
    setBusy(kind);
    try {
      if (kind === "glb") await exportGLB(voxelData);
      else if (kind === "obj") exportOBJ(voxelData);
      else exportVOX(voxelData);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  if (loadError) {
    return (
      <div className="max-w-xl w-full animate-fade-in">
        <div
          className="text-center"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            padding: "2rem",
          }}
        >
          <p
            className="text-xs p-3 mb-4"
            style={{
              background: "rgba(236,6,72,0.08)",
              border: "1px solid rgba(236,6,72,0.3)",
              borderRadius: 6,
              color: "var(--fal-red)",
            }}
          >
            {loadError}
          </p>
          <button
            onClick={onBack}
            className="text-sm px-4 py-2"
            style={{ background: "var(--fal-purple-deep)", color: "#fff", borderRadius: 6 }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (!mesh) {
    return (
      <div className="max-w-xl w-full">
        <Loading title="Loading mesh & texture…" subtitle="Fetching OBJ from fal" />
      </div>
    );
  }

  const dims = voxelData?.dims;
  const count = voxelData?.voxels.length ?? 0;

  const dlBtn = (kind: "glb" | "obj" | "vox", label: string, color: string) => (
    <button
      onClick={() => download(kind)}
      disabled={!voxelData || busy !== null}
      className="flex-1 py-2 text-sm font-medium transition-all duration-150"
      style={{
        background: color,
        color: "#fff",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.15)",
        opacity: !voxelData || busy !== null ? 0.6 : 1,
        cursor: !voxelData || busy !== null ? "not-allowed" : "pointer",
      }}
    >
      {busy === kind ? "Exporting…" : label}
    </button>
  );

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
              Voxelized model
            </h2>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {dims ? `${dims[0]}×${dims[1]}×${dims[2]} grid · ${count.toLocaleString()} voxels` : "…"}
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
            ← Back to model
          </button>
        </div>

        <div
          className="relative"
          style={{
            height: "50vh",
            borderRadius: 8,
            overflow: "hidden",
            background: "radial-gradient(circle at 50% 30%, #1a1a20, #0a0a0b)",
            border: "1px solid var(--border-color)",
          }}
        >
          <VoxelViewer data={voxelData} />
          {computing && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(10,10,11,0.55)", backdropFilter: "blur(2px)" }}
            >
              <Loading title="Voxelizing…" />
            </div>
          )}
        </div>

        {/* Resolution slider */}
        <div className="mt-5">
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Resolution (voxels across longest axis)
            </label>
            <span className="text-xs font-mono" style={{ color: "var(--fal-purple-light)" }}>
              {resolution}
            </span>
          </div>
          <input
            type="range"
            min={MIN_RES}
            max={MAX_RES}
            step={2}
            value={resolution}
            onChange={(e) => onSlider(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            <span>Coarse ({MIN_RES})</span>
            <span>Fine ({MAX_RES})</span>
          </div>
        </div>

        {/* Downloads */}
        <div className="mt-5">
          <p className="text-xs mb-2" style={{ color: "var(--text-tertiary)" }}>
            Download
          </p>
          <div className="flex gap-2">
            {dlBtn("glb", "GLB", "var(--fal-purple-deep)")}
            {dlBtn("obj", "OBJ", "var(--fal-purple-deep)")}
            {dlBtn("vox", "VOX", "var(--fal-purple-deep)")}
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--text-tertiary)" }}>
            GLB & OBJ keep per-voxel colour · VOX opens in MagicaVoxel (palette quantized).
          </p>
        </div>
      </div>
    </div>
  );
}
