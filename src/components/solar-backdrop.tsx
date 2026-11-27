import { useEffect, useRef } from "react";
import * as THREE from "three";

const STAR_COUNT = 3360;

const vertex = `
  attribute float aSize;
  attribute float aPhase;
  varying float vAlpha;
  uniform float uTime;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.45 + 0.55 * abs(sin(uTime * 0.7 + aPhase));
    gl_PointSize = aSize * twinkle * (320.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
    vAlpha = 0.25 + 0.75 * twinkle;
  }
`;

const fragment = `
  varying float vAlpha;
  void main() {
    vec2 point = gl_PointCoord - vec2(0.5);
    float dist = length(point);
    if (dist > 0.5) discard;
    float glow = smoothstep(0.5, 0.05, dist);
    gl_FragColor = vec4(0.94, 0.91, 0.84, vAlpha * glow);
  }
`;

export function SolarBackdrop() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    camera.position.set(0, 0, 8);

    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const phases = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const radius = 8 + Math.pow(Math.random(), 0.65) * 90;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      sizes[i] = Math.random() < 0.06 ? 1.8 + Math.random() * 1.5 : 0.55 + Math.random() * 1.15;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
    });
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    const fit = () => {
      const width = el.clientWidth || window.innerWidth;
      const height = el.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    fit();
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    let raf = 0;
    let running = true;
    const draw = (now: number) => {
      if (!running) return;
      const span = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scroll = window.scrollY / span;
      if (!reduced) material.uniforms.uTime.value = now * 0.001;
      stars.rotation.y = scroll * 0.55 + (reduced ? 0 : now * 0.000012);
      stars.rotation.x = scroll * 0.18;
      camera.position.y = (scroll - 0.5) * 6;
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);
    window.addEventListener("resize", fit);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />;
}
