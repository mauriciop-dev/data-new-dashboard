"use client";

import { useEffect, useRef } from "react";
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
  const doneRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (typeof window === "undefined") return;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let frame: number;
    let disposed = false;
    doneRef.current = false;

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

      const geometry = new THREE.BoxGeometry(2.2, 1.6, 0.2);

      const faceColors = [
        "hsl(221 83% 53%)",
        "hsl(160 84% 39%)",
        "hsl(262 83% 58%)",
        "hsl(200 80% 60%)",
        "hsl(155 62% 45%)",
        "hsl(20 90% 55%)",
      ].map(
        (color) =>
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
          })
      );

      const cube = new THREE.Mesh(geometry, faceColors);
      scene.add(cube);

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

        if (direction === "out") {
          cube.rotation.y = elapsed * Math.PI;
          cube.rotation.x = elapsed * (Math.PI / 2);
          cube.scale.set(
            1 + elapsed * 0.6,
            1 + elapsed * 0.6,
            1 + elapsed * 0.6
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

        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);

        if (elapsed > 1.5 && !doneRef.current) {
          doneRef.current = true;
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