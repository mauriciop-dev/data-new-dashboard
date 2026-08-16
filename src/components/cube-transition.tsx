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
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
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
      camera.position.z = 5;

      // Cubo real con volumen (depth = width) para que el giro se lea 3D
      const size = 2.2;
      const geometry = new THREE.BoxGeometry(size, size, size);

      const faceColors = [
        "#2563eb", // +x azul
        "#7c3aed", // -x violeta
        "#10b981", // +y verde
        "#0ea5e9", // -y cian
        "#f97316", // +z ámbar
        "#ec4899", // -z rosa
      ].map(
        (color) =>
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
          })
      );

      const cube = new THREE.Mesh(geometry, faceColors);
      scene.add(cube);

      // Aristas con grosor simulado: dos líneas paralelas por arista para que se lean bien
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
      });
      const edgeLines = new THREE.LineSegments(edges, edgeMat);
      edgeLines.scale.setScalar(1.002);
      cube.add(edgeLines);

      // Segunda capa de aristas un poco más pequeña para dar grosor visual (efecto marco)
      const edgeMat2 = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
      });
      const edgeLines2 = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(size * 0.99, size * 0.99, size * 0.99)),
        edgeMat2
      );
      cube.add(edgeLines2);

      // Puntos en los 8 vértices para reforzar el volumen
      const vertsGeo = new THREE.BufferGeometry();
      const h = size / 2;
      const verts = new Float32Array([
        -h, -h, -h, h, -h, -h, h, h, -h, -h, h, -h,
        -h, -h, h, h, -h, h, h, h, h, -h, h, h,
      ]);
      vertsGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      const vertsMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 1,
      });
      const vertsPts = new THREE.Points(vertsGeo, vertsMat);
      cube.add(vertsPts);

      const startTime = Date.now();
      const DURATION = 1.5;

      const animate = () => {
        if (disposed) return;

        const elapsed = (Date.now() - startTime) / 1000;
        const t = Math.min(elapsed / DURATION, 1);

        if (direction === "out") {
          // Giro completo sobre Y + cabeceo constante en X para ver 3 caras
          cube.rotation.x = -0.6;
          cube.rotation.y = elapsed * Math.PI * 2;
          cube.rotation.z = 0;
          cube.scale.set(
            1 + t * 0.55,
            1 + t * 0.55,
            1 + t * 0.55
          );
          cube.material.forEach((m) => {
            (m as THREE.MeshBasicMaterial).opacity = 0.95 - t * 0.45;
          });
          edgeMat.opacity = 1 - t * 0.5;
          edgeMat2.opacity = 0.55 - t * 0.3;
          (vertsMat as THREE.PointsMaterial).opacity = 1 - t * 0.5;
        } else {
          cube.rotation.x = 0.6;
          cube.rotation.y = -elapsed * Math.PI * 2;
          cube.rotation.z = 0;
          cube.scale.set(
            Math.max(0.01, 1.55 - elapsed * 0.55),
            Math.max(0.01, 1.55 - elapsed * 0.55),
            Math.max(0.01, 1.55 - elapsed * 0.55)
          );
          cube.material.forEach((m) => {
            (m as THREE.MeshBasicMaterial).opacity = Math.min(
              0.95,
              elapsed * 0.65
            );
          });
          edgeMat.opacity = Math.min(1, elapsed * 0.7);
          edgeMat2.opacity = Math.min(0.55, elapsed * 0.4);
          (vertsMat as THREE.PointsMaterial).opacity = Math.min(
            1,
            elapsed * 0.7
          );
        }

        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);

        if (t >= 1 && !doneRef.current) {
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
        vertsGeo.dispose();
        vertsMat.dispose();
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