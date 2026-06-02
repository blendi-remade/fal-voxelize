import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import type { VoxelData } from "./types";

/** World-space centre of a voxel cell. */
function center(data: VoxelData, x: number, y: number, z: number): [number, number, number] {
  const s = data.voxelSize;
  return [
    data.origin[0] + (x + 0.5) * s,
    data.origin[1] + (y + 0.5) * s,
    data.origin[2] + (z + 0.5) * s,
  ];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Build a single merged, vertex-coloured mesh of cubes (used for GLB export). */
function buildMergedGeometry(data: VoxelData): THREE.BufferGeometry {
  const template = new THREE.BoxGeometry(1, 1, 1);
  const tPos = template.attributes.position.array as ArrayLike<number>;
  const tNorm = template.attributes.normal.array as ArrayLike<number>;
  const tIndex = Array.from(template.index!.array);
  template.dispose();

  const vertsPerCube = tPos.length / 3; // 24
  const N = data.voxels.length;
  const s = data.voxelSize;

  const positions = new Float32Array(N * tPos.length);
  const normals = new Float32Array(N * tNorm.length);
  const colors = new Float32Array(N * tPos.length);
  const indices = new Uint32Array(N * tIndex.length);

  const col = new THREE.Color();

  for (let vi = 0; vi < N; vi++) {
    const v = data.voxels[vi];
    const [cx, cy, cz] = center(data, v.x, v.y, v.z);
    col.setRGB(v.r / 255, v.g / 255, v.b / 255, THREE.SRGBColorSpace);
    col.convertSRGBToLinear();

    const pBase = vi * tPos.length;
    for (let k = 0; k < vertsPerCube; k++) {
      positions[pBase + k * 3] = tPos[k * 3] * s + cx;
      positions[pBase + k * 3 + 1] = tPos[k * 3 + 1] * s + cy;
      positions[pBase + k * 3 + 2] = tPos[k * 3 + 2] * s + cz;
      normals[pBase + k * 3] = tNorm[k * 3];
      normals[pBase + k * 3 + 1] = tNorm[k * 3 + 1];
      normals[pBase + k * 3 + 2] = tNorm[k * 3 + 2];
      colors[pBase + k * 3] = col.r;
      colors[pBase + k * 3 + 1] = col.g;
      colors[pBase + k * 3 + 2] = col.b;
    }

    const iBase = vi * tIndex.length;
    const vOffset = vi * vertsPerCube;
    for (let m = 0; m < tIndex.length; m++) {
      indices[iBase + m] = tIndex[m] + vOffset;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

export async function exportGLB(data: VoxelData, filename = "voxels.glb") {
  const geo = buildMergedGeometry(data);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0,
    roughness: 1,
  });
  const mesh = new THREE.Mesh(geo, material);
  const scene = new THREE.Scene();
  scene.add(mesh);

  const exporter = new GLTFExporter();
  const result = (await exporter.parseAsync(scene, { binary: true })) as ArrayBuffer;
  triggerDownload(new Blob([result], { type: "model/gltf-binary" }), filename);
}

/** OBJ with the widely-supported per-vertex colour extension (v x y z r g b). */
export function exportOBJ(data: VoxelData, filename = "voxels.obj") {
  const lines: string[] = ["# Voxel export", "o voxels"];
  const faces: string[] = [];
  const s = data.voxelSize;
  let vbase = 0;

  for (const v of data.voxels) {
    const x0 = data.origin[0] + v.x * s;
    const y0 = data.origin[1] + v.y * s;
    const z0 = data.origin[2] + v.z * s;
    const x1 = x0 + s, y1 = y0 + s, z1 = z0 + s;
    const r = (v.r / 255).toFixed(4);
    const g = (v.g / 255).toFixed(4);
    const b = (v.b / 255).toFixed(4);

    // 8 corners, each carrying the voxel colour.
    const corners: [number, number, number][] = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    ];
    for (const [cx, cy, cz] of corners) {
      lines.push(`v ${cx.toFixed(5)} ${cy.toFixed(5)} ${cz.toFixed(5)} ${r} ${g} ${b}`);
    }

    const o = vbase;
    // Outward-facing quads (1-indexed, offset per cube).
    faces.push(`f ${o + 1} ${o + 4} ${o + 3} ${o + 2}`); // -Z
    faces.push(`f ${o + 5} ${o + 6} ${o + 7} ${o + 8}`); // +Z
    faces.push(`f ${o + 1} ${o + 2} ${o + 6} ${o + 5}`); // -Y
    faces.push(`f ${o + 4} ${o + 8} ${o + 7} ${o + 3}`); // +Y
    faces.push(`f ${o + 1} ${o + 5} ${o + 8} ${o + 4}`); // -X
    faces.push(`f ${o + 2} ${o + 3} ${o + 7} ${o + 6}`); // +X
    vbase += 8;
  }

  const text = lines.join("\n") + "\n" + faces.join("\n") + "\n";
  triggerDownload(new Blob([text], { type: "text/plain" }), filename);
}

/** Quantize to a <=255 colour palette (6 levels/channel = 216 colours max). */
function quantize(data: VoxelData) {
  const paletteMap = new Map<number, number>(); // packed rgb -> palette index (0-based)
  const palette: [number, number, number][] = [];
  const indices = new Uint8Array(data.voxels.length);

  const snap = (c: number) => Math.round((c / 255) * 5) * 51;

  data.voxels.forEach((v, i) => {
    const r = snap(v.r), g = snap(v.g), b = snap(v.b);
    const key = (r << 16) | (g << 8) | b;
    let idx = paletteMap.get(key);
    if (idx === undefined) {
      idx = palette.length;
      if (idx > 254) {
        idx = 0; // palette full; fall back to first colour (extremely unlikely at 216 max)
      } else {
        paletteMap.set(key, idx);
        palette.push([r, g, b]);
      }
    }
    indices[i] = idx + 1; // VOX colour indices start at 1
  });

  return { palette, indices };
}

/** MagicaVoxel .vox writer (version 150). Z-up: maps three Y -> vox Z. */
export function exportVOX(data: VoxelData, filename = "voxels.vox") {
  const [nx, ny, nz] = data.dims;
  // VOX is Z-up; our grid is Y-up. vox(x,y,z) = (grid x, grid z, grid y).
  const sx = nx, sy = nz, sz = ny;
  if (sx > 256 || sy > 256 || sz > 256) {
    throw new Error("Grid exceeds 256³; lower the resolution for VOX export.");
  }

  const { palette, indices } = quantize(data);
  const numVoxels = data.voxels.length;

  const xyziContent = 4 + numVoxels * 4;
  const childrenSize = 24 + (12 + xyziContent) + 1036;
  const total = 8 + 12 + childrenSize;

  const buf = new ArrayBuffer(total);
  const dv = new DataView(buf);
  let p = 0;

  const writeTag = (tag: string) => {
    for (let i = 0; i < 4; i++) dv.setUint8(p++, tag.charCodeAt(i));
  };
  const writeInt = (n: number) => {
    dv.setInt32(p, n, true);
    p += 4;
  };

  // Header
  writeTag("VOX ");
  writeInt(150);

  // MAIN
  writeTag("MAIN");
  writeInt(0);
  writeInt(childrenSize);

  // SIZE
  writeTag("SIZE");
  writeInt(12);
  writeInt(0);
  writeInt(sx);
  writeInt(sy);
  writeInt(sz);

  // XYZI
  writeTag("XYZI");
  writeInt(xyziContent);
  writeInt(0);
  writeInt(numVoxels);
  for (let i = 0; i < numVoxels; i++) {
    const v = data.voxels[i];
    dv.setUint8(p++, v.x);       // vox X = grid X
    dv.setUint8(p++, v.z);       // vox Y = grid Z (depth)
    dv.setUint8(p++, v.y);       // vox Z = grid Y (up)
    dv.setUint8(p++, indices[i]);
  }

  // RGBA palette (256 entries; colour index i -> rgba[i-1])
  writeTag("RGBA");
  writeInt(1024);
  writeInt(0);
  for (let i = 0; i < 256; i++) {
    const c = palette[i];
    if (c) {
      dv.setUint8(p++, c[0]);
      dv.setUint8(p++, c[1]);
      dv.setUint8(p++, c[2]);
      dv.setUint8(p++, 255);
    } else {
      dv.setUint8(p++, 0);
      dv.setUint8(p++, 0);
      dv.setUint8(p++, 0);
      dv.setUint8(p++, 255);
    }
  }

  triggerDownload(new Blob([buf], { type: "application/octet-stream" }), filename);
}
