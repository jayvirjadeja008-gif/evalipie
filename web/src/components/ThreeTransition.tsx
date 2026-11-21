import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeTransitionProps {
  onTransitionEnd?: () => void;
  durationMs?: number;
}

// Restrained palette: dark slate tones and warm amber accent matching StockSync
const PALETTE = [
  { color: 0x12161e, roughness: 0.52, metalness: 0.18, isAccent: false },
  { color: 0x181e26, roughness: 0.48, metalness: 0.22, isAccent: false },
  { color: 0x222933, roughness: 0.46, metalness: 0.25, isAccent: false },
  { color: 0xd97706, roughness: 0.42, metalness: 0.35, isAccent: true }, // StockSync Amber accent
  { color: 0x1b212b, roughness: 0.50, metalness: 0.20, isAccent: false },
];

function easeInOutDamped(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const s = 1.25;
  if (t < 0.5) {
    return (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2;
  }
  const t2 = 2 * t - 2;
  return (Math.pow(t2, 2) * ((s + 1) * t2 + s) + 2) / 2;
}

function createBeveledTileGeometry(width: number, height: number, depth: number, radius: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.016,
    bevelThickness: 0.016,
  });
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.35)');
    gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.08)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

export function ThreeTransition({ onTransitionEnd, durationMs = 650 }: ThreeTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Check reduced motion
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      onTransitionEnd?.();
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Lights
    const hemiLight = new THREE.HemisphereLight(0x21262d, 0x0e1116, 0.65);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(4, 5.5, 4.5);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 0.5);
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    // Dolly group
    const dolly = new THREE.Group();
    scene.add(dolly);

    // Tile grid
    const tileGroup = new THREE.Group();
    dolly.add(tileGroup);

    const tileGeo = createBeveledTileGeometry(1.36, 0.94, 0.04, 0.02);
    const materials: THREE.MeshPhysicalMaterial[] = [];

    let tileId = 0;
    for (let row = -1; row <= 1; row++) {
      for (let col = -1.5; col <= 1.5; col += 1) {
        const pal = PALETTE[(tileId + 1) % PALETTE.length];
        const mat = new THREE.MeshPhysicalMaterial({
          color: pal.color,
          roughness: pal.roughness,
          metalness: pal.metalness,
          clearcoat: pal.isAccent ? 0.35 : 0.1,
          clearcoatRoughness: 0.25,
          reflectivity: 0.45,
        });
        materials.push(mat);

        const mesh = new THREE.Mesh(tileGeo, mat);
        mesh.position.set(col * 1.54, row * 1.12, 0);
        tileGroup.add(mesh);
        tileId++;
      }
    }

    // Shadow plane
    const shadowTexture = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(7, 4);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(0, -1.95, 0);
    shadowMesh.rotation.x = -Math.PI / 2;
    dolly.add(shadowMesh);

    let animId: number;
    const startTime = performance.now();
    let completed = false;

    const animate = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const ease = easeInOutDamped(progress);

      // Opacity envelope
      let opacity = 1;
      if (progress < 0.18) {
        opacity = progress / 0.18;
      } else if (progress > 0.65) {
        opacity = (1 - progress) / 0.35;
      }
      container.style.opacity = Math.max(0, Math.min(1, opacity)).toFixed(3);

      // Camera dolly
      dolly.position.z = ease * 1.6;
      dolly.position.x = -Math.sin(ease * Math.PI) * 0.22;
      dolly.position.y = Math.sin(ease * Math.PI) * 0.08;

      // Group rotation
      tileGroup.rotation.y = ease * Math.PI * 0.52;
      tileGroup.rotation.x = Math.sin(ease * Math.PI) * 0.14;
      tileGroup.position.z = -Math.sin(ease * Math.PI) * 1.8;

      renderer.render(scene, camera);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else if (!completed) {
        completed = true;
        onTransitionEnd?.();
      }
    };

    animId = requestAnimationFrame(animate);

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      tileGeo.dispose();
      materials.forEach((m) => m.dispose());
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTexture.dispose();
      renderer.dispose();
    };
  }, [durationMs, onTransitionEnd]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        backgroundColor: 'rgba(14, 17, 22, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: 0,
        transition: 'opacity 0.05s linear',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

export default ThreeTransition;
