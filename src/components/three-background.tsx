"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useDashboard } from "@/lib/dashboard-store";

export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { dashboard } = useDashboard();
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (typeof window === "undefined") return;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let frame: number;
    let disposed = false;
    let mouseX = 0;
    let mouseY = 0;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        60,
        mount.clientWidth / mount.clientHeight,
        0.1,
        100
      );
      camera.position.z = 6;

      // --- Particles ---
      const count = 420;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      const palette = [
        new THREE.Color("hsl(221 83% 53%)"),
        new THREE.Color("hsl(160 84% 39%)"),
        new THREE.Color("hsl(262 83% 58%)"),
        new THREE.Color("hsl(200 80% 60%)"),
        new THREE.Color("hsl(155 62% 45%)"),
      ];

      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
        velocities[i * 3] = (Math.random() - 0.5) * 0.002;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
        const c = palette[i % palette.length];
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.03,
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      // --- Floating KPI cubes (from dashboard metrics) ---
      const kpiGroup = new THREE.Group();
      scene.add(kpiGroup);

      const metricColors = [
        new THREE.Color("hsl(221 83% 53%)"),
        new THREE.Color("hsl(160 84% 39%)"),
        new THREE.Color("hsl(262 83% 58%)"),
        new THREE.Color("hsl(200 80% 60%)"),
      ];

      const kpiGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const kpiMat = new THREE.MeshBasicMaterial({
        color: metricColors[0],
        transparent: true,
        opacity: 0.35,
        wireframe: false,
      });

      // Create floating cubes based on current metrics
      const cubeMeshes: THREE.InstancedMesh[] = [];
      const metricCount = dashboard?.metrics?.length ?? 4;
      const cubes = Math.min(metricCount, 4);

      for (let i = 0; i < cubes; i++) {
        const cube = new THREE.InstancedMesh(kpiGeo, kpiMat, 1);
        cube.instanceColor = new THREE.InstancedBufferAttribute(
          new Float32Array(3),
          3
        );
        const color = metricColors[i % metricColors.length];
        cube.setColorAt(0, color);

        const angle = (i / cubes) * Math.PI * 2;
        cube.position.set(
          Math.cos(angle) * 3.5,
          Math.sin(angle) * 1.2,
          Math.sin(angle * 0.5) * 1.5
        );
        kpiGroup.add(cube);
        cubeMeshes.push(cube);
      }

      // --- Icosahedron wireframe ---
      const wireGeo = new THREE.IcosahedronGeometry(1.6, 1);
      const wireMat = new THREE.MeshBasicMaterial({
        color: "hsl(221 83% 53%)",
        wireframe: true,
        transparent: true,
        opacity: 0.06,
      });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      scene.add(wire);

      // Store original positions for hover repulsion
      const originalPositions = positions.slice();

      const animate = () => {
        if (disposed) return;

        // Rotate particles
        points.rotation.y += 0.0005;
        points.rotation.x += 0.0003;

        // Rotate icosahedron
        wire.rotation.x += 0.002;
        wire.rotation.y += 0.0015;

        // Animate floating KPI cubes
        cubeMeshes.forEach((cube, i) => {
          cube.rotation.x += 0.003 + i * 0.001;
          cube.rotation.y += 0.002;
          cube.position.y += Math.sin(Date.now() * 0.001 + i) * 0.0005;
        });

        // Mouse-responsive particle drift
        points.rotation.y += mouseX * 0.00002;
        points.rotation.x += mouseY * 0.00001;

        // Particle physics update
        const positions = geo.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
          positions[i * 3] += velocities[i * 3] * 0.5;
          positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.5;
          positions[i * 3 + 2] += velocities[i * 3 + 2] * 0.5;

          // Return to original with easing
          positions[i * 3] += (originalPositions[i * 3] - positions[i * 3]) * 0.02;
          positions[i * 3 + 1] +=
            (originalPositions[i * 3 + 1] - positions[i * 3 + 1]) * 0.02;
          positions[i * 3 + 2] +=
            (originalPositions[i * 3 + 2] - positions[i * 3 + 2]) * 0.02;

          // Keep particles within bounds
          if (Math.abs(positions[i * 3]) > 7) velocities[i * 3] *= -1;
          if (Math.abs(positions[i * 3 + 1]) > 5) velocities[i * 3 + 1] *= -1;
          if (Math.abs(positions[i * 3 + 2]) > 4) velocities[i * 3 + 2] *= -1;
        }
        geo.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      animate();

      // --- Mouse tracking for interactivity ---
      const onMouseMove = (e: MouseEvent) => {
        const rect = mount.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        setHovered({ x: mouseX, y: mouseY });
      };
      mount.addEventListener("mousemove", onMouseMove);

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
        mount.removeEventListener("mousemove", onMouseMove);
        geo.dispose();
        mat.dispose();
        wireGeo.dispose();
        wireMat.dispose();
        kpiGeo.dispose();
        kpiMat.dispose();
        cubeMeshes.forEach((c) => c.dispose());
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    } catch {
      return;
    }
  }, [dashboard]);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 hidden opacity-70 lg:block"
    />
  );
}

