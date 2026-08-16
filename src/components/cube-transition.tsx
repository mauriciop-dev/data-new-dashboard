"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface CubeTransitionProps {
  onComplete: () => void;
  direction?: "in" | "out";
}

export default function CubeTransition({
  onComplete,
  direction = "out",
}: CubeTransitionProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (typeof window === "undefined") return;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let frame: number;
    let disposed = false;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      scene.background = null;

      camera = new THREE.PerspectiveCamera(
        45,
        mount.clientWidth / mount.clientHeight,
        0.1,
        100
      );
      camera.position.z = 4;

      // Cube geometry — will hold textures on faces
      const geometry = new THREE.BoxGeometry(1.2, 1.6, 0.2);

      // Face materials with different colors representing different chart states
      const faceColors = [
        new THREE.MeshBasicMaterial({
          color: "hsl(221 83% 53%)",
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshBasicMaterial({
          color: "hsl(160 84% 39%)",
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshBasicMaterial({
          color: "hsl(262 83% 58%)",
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshBasicMaterial({
          color: "hsl(200 80% 60%)",
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshBasicMaterial({
          color: "hsl(155 62% 45%)",
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshBasicMaterial({
          color: "hsl(20 90% 55%)",
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        }),
      ];

      const cube = new THREE.Mesh(geometry, faceColors);
      scene.add(cube);

      // Edges for glow effect
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMat = new THREE.LineBasicMaterial({
        color: "hsl(0 0% 100%)",
        transparent: true,
        opacity: 0.6,
      });
      const edgeLines = new THREE.LineSegments(edges, edgeMat);
      cube.add(edgeLines);

      const startTime = Date.now();

      const animate = () => {
        if (disposed) return;

        const elapsed = (Date.now() - startTime) / 1000;

        // Full rotation animation
        if (direction === "out") {
          cube.rotation.y = elapsed * Math.PI;
          cube.rotation.x = elapsed * (Math.PI / 2);
          cube.scale.set(
            1 + elapsed * 0.5,
            1 + elapsed * 0.5,
            1 + elapsed * 0.5
          );
          cube.material.forEach((m) => {
            (m as THREE.MeshBasicMaterial).opacity = Math.max(
              0,
              0.8 - elapsed * 0.4
            );
          });
          edgeMat.opacity = Math.max(0, 0.6 - elapsed * 0.3);
        } else {
          cube.rotation.y = -elapsed * Math.PI;
          cube.rotation.x = -elapsed * (Math.PI / 2);
          cube.scale.set(
            Math.max(0.01, 1 - elapsed * 0.5),
            Math.max(0.01, 1 - elapsed * 0.5),
            Math.max(0.01, 1 - elapsed * 0.5)
          );
          cube.material.forEach((m) => {
            (m as THREE.MeshBasicMaterial).opacity = Math.min(
              0.8,
              elapsed * 0.8
            );
          });
          edgeMat.opacity = Math.min(0.6, elapsed * 0.6);
        }

        setProgress((elapsed % 1));

        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);

        // Complete after ~1.5 seconds of animation
        if (elapsed > 1.5) {
          onComplete();
        }
      };
      animate();

      const onResize = () => {
        if (!mount) return;
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", onResize);
        geometry.dispose();
        faceColors.forEach((m) => m.dispose());
        edges.dispose();
        edgeMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    } catch {
      onComplete();
      return;
    }
  }, [onComplete, direction]);

  return (
    <div
      ref={mountRef}
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    />
  );
}
