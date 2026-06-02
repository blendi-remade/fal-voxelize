"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { VoxelData } from "@/lib/types";

interface Props {
  data: VoxelData | null;
  className?: string;
}

/** Orbit viewer that renders voxels as an InstancedMesh of coloured cubes. */
export default function VoxelViewer({ data, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const instancedRef = useRef<THREE.InstancedMesh | null>(null);

  // ---- one-time scene setup ----
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.01,
      10000
    );
    camera.position.set(2, 2, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 5, 2);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(-3, 2, -3);
    scene.add(fill);

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  // ---- rebuild voxel mesh when data changes ----
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls || !data) return;

    if (instancedRef.current) {
      scene.remove(instancedRef.current);
      instancedRef.current.geometry.dispose();
      (instancedRef.current.material as THREE.Material).dispose();
      instancedRef.current = null;
    }

    const { voxels, voxelSize, origin, dims } = data;
    if (voxels.length === 0) return;

    // Centre the whole grid at the world origin for comfortable orbiting.
    const cx = origin[0] + (dims[0] * voxelSize) / 2;
    const cy = origin[1] + (dims[1] * voxelSize) / 2;
    const cz = origin[2] + (dims[2] * voxelSize) / 2;

    const geo = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
    const mat = new THREE.MeshStandardMaterial({ metalness: 0, roughness: 0.95 });
    const mesh = new THREE.InstancedMesh(geo, mat, voxels.length);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      dummy.position.set(
        origin[0] + (v.x + 0.5) * voxelSize - cx,
        origin[1] + (v.y + 0.5) * voxelSize - cy,
        origin[2] + (v.z + 0.5) * voxelSize - cz
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setRGB(v.r / 255, v.g / 255, v.b / 255, THREE.SRGBColorSpace);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    scene.add(mesh);
    instancedRef.current = mesh;

    // Frame camera to the grid extents.
    const extent = Math.max(dims[0], dims[1], dims[2]) * voxelSize || 1;
    const dist = extent / (2 * Math.tan((Math.PI * camera.fov) / 360));
    camera.position.set(dist * 1.1, dist * 0.9, dist * 1.4);
    camera.near = extent / 100;
    camera.far = extent * 100;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
  }, [data]);

  return <div ref={containerRef} className={className ?? "w-full h-full"} />;
}
