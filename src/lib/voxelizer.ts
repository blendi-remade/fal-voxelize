import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import type { VoxelData, Voxel } from "./types";

/** Geometry + texture pulled once, then re-voxelized cheaply as the slider moves. */
export interface MeshData {
  /** Triangle soup: 9 floats (3 verts × xyz) per triangle. */
  positions: Float32Array;
  /** Triangle soup: 6 floats (3 verts × uv) per triangle, or null if untextured. */
  uvs: Float32Array | null;
  bbox: THREE.Box3;
  texture: { data: Uint8ClampedArray; width: number; height: number } | null;
}

const DEFAULT_COLOR: [number, number, number] = [170, 170, 170];

function proxied(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

async function loadTexture(url: string): Promise<MeshData["texture"]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("texture load failed"));
    img.src = proxied(url);
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data, width: canvas.width, height: canvas.height };
}

/** Download + parse the OBJ and texture. Done once per generated model. */
export async function loadMesh(objUrl: string, textureUrl?: string): Promise<MeshData> {
  const objText = await fetch(proxied(objUrl)).then((r) => {
    if (!r.ok) throw new Error(`OBJ fetch failed (${r.status})`);
    return r.text();
  });

  const group = new OBJLoader().parse(objText);

  const posChunks: Float32Array[] = [];
  const uvChunks: Float32Array[] = [];
  let hasUvs = true;
  const bbox = new THREE.Box3();

  group.updateMatrixWorld(true);
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute | undefined;

    // Bake world transform into positions.
    const m = mesh.matrixWorld;
    const arr = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      arr[i * 3] = v.x;
      arr[i * 3 + 1] = v.y;
      arr[i * 3 + 2] = v.z;
      bbox.expandByPoint(v);
    }
    posChunks.push(arr);

    if (uv) {
      const u = new Float32Array(uv.count * 2);
      for (let i = 0; i < uv.count; i++) {
        u[i * 2] = uv.getX(i);
        u[i * 2 + 1] = uv.getY(i);
      }
      uvChunks.push(u);
    } else {
      hasUvs = false;
    }
  });

  if (posChunks.length === 0) throw new Error("OBJ contained no geometry");

  const positions = concatFloat32(posChunks);
  const uvs = hasUvs && uvChunks.length === posChunks.length ? concatFloat32(uvChunks) : null;

  let texture: MeshData["texture"] = null;
  if (textureUrl && uvs) {
    try {
      texture = await loadTexture(textureUrl);
    } catch {
      texture = null;
    }
  }

  return { positions, uvs, bbox, texture };
}

function concatFloat32(chunks: Float32Array[]): Float32Array {
  if (chunks.length === 1) return chunks[0];
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/** Bilinear-ish nearest texel sample with UV wrapping and V-flip. */
function sampleTexture(
  tex: NonNullable<MeshData["texture"]>,
  u: number,
  v: number
): [number, number, number] {
  let uu = u - Math.floor(u);
  let vv = v - Math.floor(v);
  if (uu < 0) uu += 1;
  if (vv < 0) vv += 1;
  const px = Math.min(tex.width - 1, Math.floor(uu * tex.width));
  const py = Math.min(tex.height - 1, Math.floor((1 - vv) * tex.height));
  const idx = (py * tex.width + px) * 4;
  return [tex.data[idx], tex.data[idx + 1], tex.data[idx + 2]];
}

interface Acc {
  r: number;
  g: number;
  b: number;
  c: number;
}

/**
 * Surface voxelization. Walks every triangle, super-samples it densely enough
 * to hit each covered voxel, and averages the texture colour per cell.
 *
 * @param resolution number of voxels spanning the model's longest axis.
 */
export function voxelizeMesh(mesh: MeshData, resolution: number): VoxelData {
  const size = new THREE.Vector3();
  mesh.bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const voxelSize = maxDim / resolution;

  const nx = Math.max(1, Math.ceil(size.x / voxelSize));
  const ny = Math.max(1, Math.ceil(size.y / voxelSize));
  const nz = Math.max(1, Math.ceil(size.z / voxelSize));

  const ox = mesh.bbox.min.x;
  const oy = mesh.bbox.min.y;
  const oz = mesh.bbox.min.z;

  const map = new Map<number, Acc>();
  const p = mesh.positions;
  const uv = mesh.uvs;
  const tex = mesh.texture;
  const triCount = p.length / 9;
  const invVox = 1 / voxelSize;

  for (let t = 0; t < triCount; t++) {
    const pi = t * 9;
    const ax = p[pi], ay = p[pi + 1], az = p[pi + 2];
    const bx = p[pi + 3], by = p[pi + 4], bz = p[pi + 5];
    const cx = p[pi + 6], cy = p[pi + 7], cz = p[pi + 8];

    // Subdivision count so samples land ~half a voxel apart.
    const e1 = Math.hypot(bx - ax, by - ay, bz - az);
    const e2 = Math.hypot(cx - bx, cy - by, cz - bz);
    const e3 = Math.hypot(ax - cx, ay - cy, az - cz);
    const maxEdge = Math.max(e1, e2, e3);
    const n = Math.min(64, Math.max(1, Math.ceil(maxEdge * invVox * 2)));

    let ua = 0, va = 0, ub = 0, vb = 0, uc = 0, vc = 0;
    if (uv) {
      const ui = t * 6;
      ua = uv[ui]; va = uv[ui + 1];
      ub = uv[ui + 2]; vb = uv[ui + 3];
      uc = uv[ui + 4]; vc = uv[ui + 5];
    }

    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n - i; j++) {
        const wa = i / n;
        const wb = j / n;
        const wc = 1 - wa - wb;

        const x = wa * ax + wb * bx + wc * cx;
        const y = wa * ay + wb * by + wc * cy;
        const z = wa * az + wb * bz + wc * cz;

        const gx = Math.min(nx - 1, Math.floor((x - ox) * invVox));
        const gy = Math.min(ny - 1, Math.floor((y - oy) * invVox));
        const gz = Math.min(nz - 1, Math.floor((z - oz) * invVox));

        let r = DEFAULT_COLOR[0], g = DEFAULT_COLOR[1], bl = DEFAULT_COLOR[2];
        if (tex && uv) {
          const su = wa * ua + wb * ub + wc * uc;
          const sv = wa * va + wb * vb + wc * vc;
          [r, g, bl] = sampleTexture(tex, su, sv);
        }

        const key = (gx * ny + gy) * nz + gz;
        const acc = map.get(key);
        if (acc) {
          acc.r += r; acc.g += g; acc.b += bl; acc.c += 1;
        } else {
          map.set(key, { r, g, b: bl, c: 1 });
        }
      }
    }
  }

  const voxels: Voxel[] = [];
  for (const [key, acc] of map) {
    const gz = key % nz;
    const gy = Math.floor(key / nz) % ny;
    const gx = Math.floor(key / (nz * ny));
    voxels.push({
      x: gx,
      y: gy,
      z: gz,
      r: Math.round(acc.r / acc.c),
      g: Math.round(acc.g / acc.c),
      b: Math.round(acc.b / acc.c),
    });
  }

  return {
    voxels,
    dims: [nx, ny, nz],
    voxelSize,
    origin: [ox, oy, oz],
  };
}
