"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useDashboard, type BackgroundTheme } from "@/lib/dashboard-store";

// Paleta, formas y velocidad por tema. El fondo cambia sutilmente según el
// contexto de lo que se está hablando (ventas, productos, categorías, órdenes).
const THEMES: Record<
  BackgroundTheme,
  {
    label: string;
    palette: string[];
    aurora: {
      base: string;
      c1: string;
      c2: string;
      c3: string;
      c4: string;
    };
    speed: number;
    shape: "coins" | "boxes" | "rings" | "orb" | "default";
  }
> = {
  default: {
    label: "Resumen",
    palette: [
      "hsl(221 83% 53%)",
      "hsl(160 84% 39%)",
      "hsl(262 83% 58%)",
      "hsl(200 80% 60%)",
      "hsl(155 62% 45%)",
    ],
    aurora: {
      base: "oklch(0.98 0.02 240)",
      c1: "oklch(0.78 0.13 230)",
      c2: "oklch(0.86 0.11 165)",
      c3: "oklch(0.79 0.14 295)",
      c4: "oklch(0.83 0.12 210)",
    },
    speed: 1,
    shape: "default",
  },
  ventas: {
    label: "Ventas",
    palette: [
      "hsl(160 84% 39%)",
      "hsl(142 71% 45%)",
      "hsl(155 62% 45%)",
      "hsl(100 60% 50%)",
      "hsl(150 80% 55%)",
    ],
    aurora: {
      base: "oklch(0.98 0.02 165)",
      c1: "oklch(0.8 0.13 165)",
      c2: "oklch(0.84 0.12 145)",
      c3: "oklch(0.78 0.14 190)",
      c4: "oklch(0.82 0.12 155)",
    },
    speed: 1.2,
    shape: "coins",
  },
  productos: {
    label: "Productos",
    palette: [
      "hsl(221 83% 53%)",
      "hsl(262 83% 58%)",
      "hsl(250 90% 66%)",
      "hsl(217 91% 60%)",
    ],
    aurora: {
      base: "oklch(0.98 0.02 260)",
      c1: "oklch(0.79 0.14 250)",
      c2: "oklch(0.82 0.14 295)",
      c3: "oklch(0.77 0.12 235)",
      c4: "oklch(0.85 0.11 260)",
    },
    speed: 1.1,
    shape: "boxes",
  },
  categorias: {
    label: "Categorías",
    palette: [
      "hsl(30 100% 55%)",
      "hsl(20 90% 56%)",
      "hsl(340 82% 55%)",
      "hsl(0 72% 55%)",
    ],
    aurora: {
      base: "oklch(0.98 0.02 45)",
      c1: "oklch(0.84 0.13 55)",
      c2: "oklch(0.79 0.14 20)",
      c3: "oklch(0.8 0.15 350)",
      c4: "oklch(0.86 0.1 40)",
    },
    speed: 1.15,
    shape: "rings",
  },
  ordenes: {
    label: "Órdenes",
    palette: [
      "hsl(199 89% 48%)",
      "hsl(200 80% 60%)",
      "hsl(187 92% 56%)",
      "hsl(217 91% 60%)",
    ],
    aurora: {
      base: "oklch(0.98 0.02 220)",
      c1: "oklch(0.79 0.13 230)",
      c2: "oklch(0.86 0.11 190)",
      c3: "oklch(0.78 0.13 250)",
      c4: "oklch(0.84 0.12 215)",
    },
    speed: 1.3,
    shape: "orb",
  },
};

export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useDashboard();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (typeof window === "undefined") return;

const cfg = THEMES[theme] ?? THEMES.default;
    const palette = cfg.palette.map((c) => new THREE.Color(c));

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

      // --- Ambient glow: tinte del tema sobre todo el fondo ---
      const glowGeo = new THREE.IcosahedronGeometry(9, 2);
      const glowMat = new THREE.MeshBasicMaterial({
        color: palette[0],
        transparent: true,
        opacity: 0.5,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      scene.add(glow);

      // --- Particles ---
      const count = 700;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);

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
        size: 0.14,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      // --- Decor figures depending on theme ---
      const decoGroup = new THREE.Group();
      scene.add(decoGroup);

      const addShape = (
        geometry: THREE.BufferGeometry,
        color: THREE.Color,
        opacity: number,
        pos: THREE.Vector3
      ) => {
        const meshMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          wireframe: true,
        });
        const solidMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: opacity * 0.25,
        });
        const mesh = new THREE.Mesh(geometry, [solidMaterial, meshMaterial]);
        mesh.position.copy(pos);
        mesh.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        mesh.userData.spin = {
          x: (Math.random() - 0.5) * 0.005,
          y: (Math.random() - 0.5) * 0.005,
        };
        decoGroup.add(mesh);
        return mesh;
      };

      const geoShared: Record<string, THREE.BufferGeometry> = {
        coin: new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12),
        box: new THREE.BoxGeometry(0.16, 0.16, 0.16),
        ring: new THREE.TorusGeometry(0.2, 0.045, 8, 20),
        orb: new THREE.SphereGeometry(0.14, 10, 10),
        wire: new THREE.IcosahedronGeometry(1.8, 1),
      };

      const decoCount = 7;
      for (let i = 0; i < decoCount; i++) {
        let shapeKey: keyof typeof geoShared = "wire";
        if (cfg.shape === "coins") shapeKey = "coin";
        else if (cfg.shape === "boxes") shapeKey = "box";
        else if (cfg.shape === "rings") shapeKey = "ring";
        else if (cfg.shape === "orb") shapeKey = "orb";

        // Debajo de las esquinas, fuera del contenido central
        const corner = i % 4;
        const spread = 5.5;
        const pos = new THREE.Vector3(
          (corner === 0 || corner === 2 ? -1 : 1) * spread +
            (Math.random() - 0.5) * 1.5,
          (corner < 2 ? -1 : 1) * (2.2 + Math.random() * 1.5),
          (Math.random() - 0.5) * 4
        );
        const color = palette[i % palette.length];
        const opacity = 0.5 + Math.random() * 0.3;
        addShape(geoShared[shapeKey], color, opacity, pos);
        // También un wireframe central ligero
        if (i === 0) {
          addShape(geoShared.wire, palette[0], 0.3, new THREE.Vector3(0, 0, -0.5));
        }
      }

      // --- Floating KPI cubes (from dashboard metrics) ---
      const kpiGroup = new THREE.Group();
      scene.add(kpiGroup);

      const kpiGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
      const cubeMeshes: THREE.InstancedMesh[] = [];

      for (let i = 0; i < 4; i++) {
        const cube = new THREE.InstancedMesh(
          kpiGeo,
          new THREE.MeshBasicMaterial({
            color: palette[i % palette.length],
            transparent: true,
            opacity: 0.85,
          }),
          1
        );
        cube.setColorAt(
          0,
          palette[i % palette.length]
        );
        const angle = (i / 4) * Math.PI * 2;
        cube.position.set(
          Math.cos(angle) * 3.5,
          Math.sin(angle) * 1.2,
          Math.sin(angle * 0.5) * 1.5
        );
        kpiGroup.add(cube);
        cubeMeshes.push(cube);
      }

      const originalPositions = positions.slice();

      const animate = () => {
        if (disposed) return;

        const sp = cfg.speed;

        points.rotation.y += 0.0005 * sp;
        points.rotation.x += 0.0003 * sp;

        decoGroup.children.forEach((obj) => {
          obj.rotation.x += (obj.userData.spin?.x ?? 0.003) * sp;
          obj.rotation.y += (obj.userData.spin?.y ?? 0.002) * sp;
          obj.position.y += Math.sin(Date.now() * 0.0008 + obj.id) * 0.0004 * sp;
        });

        cubeMeshes.forEach((cube, i) => {
          cube.rotation.x += (0.003 + i * 0.001) * sp;
          cube.rotation.y += 0.002 * sp;
          cube.position.y +=
            Math.sin(Date.now() * 0.001 + i) * 0.0005 * sp;
        });

        points.rotation.y += mouseX * 0.00002 * sp;
        points.rotation.x += mouseY * 0.00001 * sp;

        const posArr = geo.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
          posArr[i * 3] += velocities[i * 3] * 0.5 * sp;
          posArr[i * 3 + 1] += velocities[i * 3 + 1] * 0.5 * sp;
          posArr[i * 3 + 2] += velocities[i * 3 + 2] * 0.5 * sp;

          posArr[i * 3] +=
            (originalPositions[i * 3] - posArr[i * 3]) * 0.02;
          posArr[i * 3 + 1] +=
            (originalPositions[i * 3 + 1] - posArr[i * 3 + 1]) * 0.02;
          posArr[i * 3 + 2] +=
            (originalPositions[i * 3 + 2] - posArr[i * 3 + 2]) * 0.02;

          if (Math.abs(posArr[i * 3]) > 7) velocities[i * 3] *= -1;
          if (Math.abs(posArr[i * 3 + 1]) > 5) velocities[i * 3 + 1] *= -1;
          if (Math.abs(posArr[i * 3 + 2]) > 4) velocities[i * 3 + 2] *= -1;
        }
        geo.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      animate();

      const onMouseMove = (e: MouseEvent) => {
        const rect = mount.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
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
        Object.values(geoShared).forEach((g) => g.dispose());
        decoGroup.children.forEach((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.material) {
            (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) =>
              (m as THREE.Material).dispose()
            );
          }
        });
        kpiGeo.dispose();
        cubeMeshes.forEach((c) => c.dispose());
        glowGeo.dispose();
        glowMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    } catch {
      return;
    }
  }, [theme]);

  const aurora = THEMES[theme]?.aurora ?? THEMES.default.aurora;

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={
        {
          "--aurora-1": aurora.c1,
          "--aurora-2": aurora.c2,
          "--aurora-3": aurora.c3,
          "--aurora-4": aurora.c4,
          "--aurora-base": aurora.base,
        } as React.CSSProperties
      }
    >
      {/* Capa aurora (gradientes suaves estilo macOS) */}
      <div className="aurora-background absolute inset-0" />
    </div>
  );
}