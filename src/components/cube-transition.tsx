"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import DashboardPages from "./dashboard/dashboard-pages";

interface CubeTransitionProps {
  onComplete: () => void;
  direction: "in" | "out";
  /** Página actual (la que se ve al montar el cubo) */
  page: number;
  /** Página destino (solo en fase "out") */
  next?: number | null;
}

const PAGE_LABELS = ["Resumen", "Productos", "Órdenes"];

/**
 * Transición de cubo 3D estilo "índice Power BI": cada cara del cubo contiene
 * una página viva del informe (gráficos + tablas) y el cubo gira sobre su eje Y
 * 90° para traer al frente la página destino.
 *
 * Los elementos de las caras se crean en el effect y el contenido React se
 * inyecta con createPortal: heredan el contexto del dashboard (store Provider)
 * sin que React sea propietario de la ubicación del nodo (el CSS3DRenderer los
 * mueve a su propio contenedor 3D).
 */
export default function CubeTransition({
  onComplete,
  direction = "out",
  page,
  next,
}: CubeTransitionProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const faceEls = useRef<(HTMLDivElement | null)[]>([]);
  const facesReadyRef = useRef(false);
  const [portalEls, setPortalEls] = useState<(HTMLDivElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const doneRef = useRef(false);

  const from = page;
  const to = next ?? page;
  const dist = (((to - from) % 3) + 3) % 3; // 0 igual, 1 siguiente, 2 anterior
  const faces = [
    from, // frente (página actual)
    (from + 1) % 3, // derecha
    ((((3 - from - to) % 3) + 3) % 3), // atrás
    (from + 2) % 3, // izquierda
  ];

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || typeof window === "undefined") return;

    doneRef.current = false;
    facesReadyRef.current = false;

    let frame: number;
    let renderer: CSS3DRenderer | null = null;
    const scene = new THREE.Scene();
    const group = new THREE.Object3D();

    try {
      const W = mount.clientWidth || 1;
      const H = mount.clientHeight || 1;

      renderer = new CSS3DRenderer();
      renderer.setSize(W, H);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.top = "0";
      renderer.domElement.style.left = "0";
      renderer.domElement.style.pointerEvents = "none";
      renderer.domElement.style.overflow = "hidden";
      mount.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(45, W / H, 1, 20000);
      camera.position.z =
        H / 2 / Math.tan(((45 / 2) * Math.PI) / 180) + W / 2;
      camera.lookAt(0, 0, 0);

      const makeFaceEl = () => {
        const el = document.createElement("div");
        el.style.width = `${W}px`;
        el.style.height = `${H}px`;
        el.style.position = "absolute";
        el.style.left = "0";
        el.style.top = "0";
        el.style.background = "rgba(255,255,255,0.88)";
        el.style.backdropFilter = "blur(8px)";
        el.style.borderRadius = "18px";
        el.style.border = "1px solid rgba(255,255,255,0.9)";
        el.style.boxShadow =
          "0 24px 70px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.8)";
        el.style.overflow = "hidden";
        el.style.pointerEvents = "none";
        el.style.contain = "layout paint style";
        return el;
      };

      const thetas = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      faceEls.current = thetas.map((theta, i) => {
        const el = makeFaceEl();
        const obj = new CSS3DObject(el);
        obj.rotation.y = theta;
        if (i === 0) obj.position.z = W / 2; // frente
        else if (i === 2) obj.position.z = -W / 2; // atrás
        else obj.position.x = Math.sign(theta) * (W / 2); // lados
        group.add(obj);
        return el;
      });
      setPortalEls([...faceEls.current]);

      // Caras arriba/abajo (estáticas, cierran el cubo)
      const makeStatEl = (label: string) => {
        const el = document.createElement("div");
        el.style.width = `${W}px`;
        el.style.height = `${H}px`;
        el.style.position = "absolute";
        el.style.background =
          "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(59,130,246,0.2))";
        el.style.borderRadius = "18px";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.fontWeight = "700";
        el.style.fontSize = "24px";
        el.style.color = "#0f172a";
        el.style.fontFamily = "system-ui, sans-serif";
        el.textContent = label;
        el.style.pointerEvents = "none";
        return el;
      };

      const topEl = makeStatEl("Pulse Analytics");
      const topObj = new CSS3DObject(topEl);
      topObj.rotation.x = Math.PI / 2;
      topObj.position.y = H / 2;
      topObj.scale.set(1, W / H, 1);
      const bottomEl = makeStatEl("Panel en vivo");
      const bottomObj = new CSS3DObject(bottomEl);
      bottomObj.rotation.x = -Math.PI / 2;
      bottomObj.position.y = -H / 2;
      bottomObj.scale.set(1, W / H, 1);
      group.add(topObj);
      group.add(bottomObj);

      scene.add(group);

      const start = Date.now();
      const DURATION_OUT = 0.95;
      const DURATION_IN = 0.55;
      const duration = direction === "out" ? DURATION_OUT : DURATION_IN;

      // Giro: siguiente (destino a la derecha) gira −90°, anterior gira +90°.
      const targetAngle =
        direction === "out"
          ? dist === 2
            ? Math.PI / 2
            : -Math.PI / 2
          : 0;
      const focused = direction === "out" ? targetAngle : 0;

      const animate = () => {
        if (!renderer) return;
        const t = Math.min((Date.now() - start) / 1000, duration);
        const k = t / duration;
        const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

        group.rotation.y = focused * eased;
        const breathe = 1 + (direction === "out" ? 0.02 : 0.03) * (1 - eased);
        group.scale.setScalar(breathe);
        if (renderer.domElement) {
          renderer.domElement.style.opacity = String(
            direction === "in" ? eased : 1
          );
        }

        if (eased >= 1 && !doneRef.current) {
          doneRef.current = true;
          onComplete();
        }

        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      animate();
      facesReadyRef.current = true;
    } catch {
      onComplete();
      return;
    }

    return () => {
      cancelAnimationFrame(frame);
      if (renderer && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      faceEls.current = [];
      setPortalEls([null, null, null, null]);
    };
  }, [onComplete, direction, page, next, dist]);

  return (
    <div
      ref={mountRef}
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      {portalEls.map((el, i) =>
        el ? (
          createPortal(<DashboardPages page={faces[i]} />, el)
        ) : null
      )}
    </div>
  );
}