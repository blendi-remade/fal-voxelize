// ---- fal output types ----

export interface FalFile {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
}

export interface ImageResult {
  images: FalFile[];
  description?: string;
}

export interface ModelUrls {
  obj?: FalFile;
  glb?: FalFile;
  fbx?: FalFile;
  mtl?: FalFile;
  texture?: FalFile;
  usdz?: FalFile;
}

export interface ModelResult {
  model_glb: FalFile;
  model_urls: ModelUrls;
  thumbnail?: FalFile;
  seed?: number;
}

// ---- app flow ----

export type Phase = "prompt" | "image" | "model" | "voxel";

export interface AppState {
  phase: Phase;

  // step 1: image
  prompt: string;
  aspectRatio: string;
  imageUrl: string | null;
  imageGenerating: boolean;
  imageError: string | null;

  // step 2: 3d model
  modelData: ModelResult | null;
  modelGenerating: boolean;
  modelError: string | null;
}

// ---- voxelization ----

export interface Voxel {
  x: number; // grid index
  y: number;
  z: number;
  r: number; // 0-255
  g: number;
  b: number;
}

export interface VoxelData {
  voxels: Voxel[];
  dims: [number, number, number]; // grid size (nx, ny, nz)
  voxelSize: number; // world units per voxel
  origin: [number, number, number]; // world-space min corner of grid
}
