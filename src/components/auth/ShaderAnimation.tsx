import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { VERTEX_SHADER, SHADER_THEMES, DEFAULT_THEME_ID, type ShaderTheme } from "./shaderThemes";

const Warp = lazy(() => import("@paper-design/shaders-react").then((mod) => ({ default: mod.Warp })));

declare global {
  interface Window {
    THREE: any;
  }
}

type BackdropMode = "pending" | "static" | "webgl";

interface ShaderAnimationProps {
  /** Active shader theme ID — defaults to the first (quantum-shimmer) */
  themeId?: string;
}

/**
 * Full-screen auth backdrop. Uses a lightweight gradient when
 * `prefers-reduced-motion` is set or before WebGL is ready — avoids burning
 * GPU + loading legacy Three from CDN for users who need a calm sign-in.
 */
export function ShaderAnimation({ themeId = DEFAULT_THEME_ID }: ShaderAnimationProps) {
  const [mode, setMode] = useState<BackdropMode>("pending");
  const [fragmentShader, setFragmentShader] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    camera: any;
    scene: any;
    renderer: any;
    uniforms: any;
    mesh: any;
    animationId: number | null;
    resizeHandler: (() => void) | null;
    mouseHandler: ((e: MouseEvent) => void) | null;
  }>({
    camera: null,
    scene: null,
    renderer: null,
    uniforms: null,
    mesh: null,
    animationId: null,
    resizeHandler: null,
    mouseHandler: null,
  });

  /* resolve theme object */
  const theme: ShaderTheme =
    SHADER_THEMES.find((t) => t.id === themeId) || SHADER_THEMES[0];

  /* current theme ID for hot-swap detection */
  const activeThemeRef = useRef(theme.id);

  /* load fragment shader dynamically */
  useEffect(() => {
    let isMounted = true;
    theme.loadFragmentShader().then(shaderText => {
      if (isMounted) setFragmentShader(shaderText);
    }).catch(() => {
      if (isMounted) setFragmentShader('void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); }');
    });
    return () => {
      isMounted = false;
    };
  }, [theme]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setMode("static");
      return;
    }
    setMode("webgl");
  }, []);

  /* ── Initial WebGL setup (only once) ───────────────────── */
  useEffect(() => {
    if (mode !== "webgl") return;

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (containerRef.current && window.THREE) {
        initThreeJS();
      }
    };
    document.head.appendChild(script);

    return () => {
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      if (sceneRef.current.resizeHandler) {
        window.removeEventListener("resize", sceneRef.current.resizeHandler);
      }
      if (sceneRef.current.mouseHandler) {
        window.removeEventListener("mousemove", sceneRef.current.mouseHandler);
      }
      if (sceneRef.current.renderer) {
        sceneRef.current.renderer.dispose();
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* ── Hot-swap shader when theme changes ────────────────── */
  useEffect(() => {
    if (mode !== "webgl") return;
    if (!fragmentShader) return;
    
    const { scene, renderer, camera, uniforms } = sceneRef.current;
    if (!scene || !renderer || !window.THREE) return;

    if (theme.id === activeThemeRef.current && sceneRef.current.mesh) return;
    activeThemeRef.current = theme.id;

    const THREE = window.THREE;

    /* Remove old mesh */
    if (sceneRef.current.mesh) {
      scene.remove(sceneRef.current.mesh);
      sceneRef.current.mesh.geometry.dispose();
      sceneRef.current.mesh.material.dispose();
    }

    /* Create new material with new shader */
    const geometry = new THREE.PlaneBufferGeometry(2, 2);
    const safeFragmentShader = theme.id === "paperWarp" 
      ? 'void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); }' 
      : fragmentShader;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: safeFragmentShader,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    sceneRef.current.mesh = mesh;

    /* Force an immediate render */
    renderer.render(scene, camera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragmentShader, mode, theme.id]);

  const initThreeJS = () => {
    if (!containerRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const container = containerRef.current;
    container.innerHTML = "";

    const camera = new THREE.Camera();
    camera.position.z = 1;
    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneBufferGeometry(2, 2);

    const uniforms = {
      time: { type: "f", value: 1.0 },
      resolution: { type: "v2", value: new THREE.Vector2() },
      iTime: { type: "f", value: 1.0 },
      iResolution: { type: "v2", value: new THREE.Vector2() },
      iMouse: { type: "v2", value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) },
    };

    // We start without a mesh, letting the fragmentShader hot-swap logic add it
    // once the shader code properly loads.
    const safeFragmentShader = 'void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); }';

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: safeFragmentShader,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const onWindowResize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
      uniforms.iResolution.value.x = renderer.domElement.width;
      uniforms.iResolution.value.y = renderer.domElement.height;
    };

    const onMouseMove = (e: MouseEvent) => {
      uniforms.iMouse.value.set(e.clientX, container.clientHeight - e.clientY);
    };

    onWindowResize();
    window.addEventListener("resize", onWindowResize, false);
    window.addEventListener("mousemove", onMouseMove, false);

    sceneRef.current = {
      camera,
      scene,
      renderer,
      uniforms,
      mesh,
      animationId: null,
      resizeHandler: onWindowResize,
      mouseHandler: onMouseMove,
    };

    const animate = () => {
      sceneRef.current.animationId = requestAnimationFrame(animate);
      uniforms.time.value += 0.02;
      uniforms.iTime.value += 0.02;
      renderer.render(scene, camera);
    };

    animate();
  };

  if (mode === "pending" || mode === "static") {
    return (
      <div
        className="fixed inset-0 z-0 h-full w-full bg-gradient-to-br from-background via-primary/[0.06] to-background"
        aria-hidden
      />
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`fixed inset-0 z-0 h-full w-full ${theme.id === 'paperWarp' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-hidden
      />
      {theme.id === "paperWarp" && (
        <div className="fixed inset-0 z-0 h-full w-full bg-black/90" aria-hidden>
          <div className="absolute inset-0">
            <Suspense fallback={null}>
              <Warp
                style={{ height: "100%", width: "100%" }}
                proportion={0.45}
                softness={1}
                distortion={0.25}
                swirl={0.8}
                swirlIterations={10}
                shape="checks"
                shapeScale={0.1}
                scale={1}
                rotation={0}
                speed={1}
                colors={["hsl(200, 100%, 20%)", "hsl(160, 100%, 75%)", "hsl(180, 90%, 30%)", "hsl(170, 100%, 80%)"]}
              />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
