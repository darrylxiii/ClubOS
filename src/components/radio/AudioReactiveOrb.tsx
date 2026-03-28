import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// ── Perlin noise (simplified 3D) ───────────────────────────────────────────────

const perm = new Uint8Array(512);
for (let i = 0; i < 256; i++) perm[i] = i;
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [perm[i], perm[j]] = [perm[j], perm[i]];
}
for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number) { return a + t * (b - a); }
function grad(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function noise3D(x: number, y: number, z: number) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
  return lerp(
    lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
      lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
      lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
}

// ── Vertex + Fragment shaders ──────────────────────────────────────────────────

const vertexShader = `
  uniform float u_time;
  uniform float u_bass;
  uniform float u_mid;
  uniform float u_treble;
  uniform float u_rms;
  varying vec3 vNormal;
  varying float vDisplacement;

  // Perlin noise is computed in JS and applied via position attribute
  // But we add a simple procedural displacement here too
  void main() {
    vNormal = normalize(normalMatrix * normal);

    // Frequency-driven displacement
    float displacement = u_bass * 0.4 + u_mid * 0.2 + u_treble * 0.1;
    displacement *= (0.5 + u_rms * 1.5);

    // Wobble based on vertex position and time
    float wobble = sin(position.x * 3.0 + u_time * 2.0) *
                   cos(position.y * 3.0 + u_time * 1.5) *
                   sin(position.z * 3.0 + u_time * 1.0);

    vec3 newPosition = position + normal * displacement * (0.3 + wobble * 0.7);
    vDisplacement = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float u_time;
  uniform float u_bass;
  uniform float u_mid;
  uniform float u_treble;
  uniform float u_rms;
  varying vec3 vNormal;
  varying float vDisplacement;

  void main() {
    // Fresnel effect — edges glow brighter
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);

    // Color shifts with audio
    float r = 0.5 + u_bass * 0.3;
    float g = 0.2 + u_treble * 0.4;
    float b = 0.8 + u_mid * 0.2;

    vec3 color = vec3(r, g, b);
    color += fresnel * vec3(0.3, 0.1, 0.5);
    color += vDisplacement * vec3(0.2, 0.0, 0.3);

    // Pulse brightness with RMS
    float brightness = 0.6 + u_rms * 0.8;
    color *= brightness;

    gl_FragColor = vec4(color, 0.85);
  }
`;

// ── The Orb Mesh ───────────────────────────────────────────────────────────────

interface OrbProps {
  bass: number;
  mid: number;
  treble: number;
  rms: number;
}

function Orb({ bass, mid, treble, rms }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_bass: { value: 0 },
      u_mid: { value: 0 },
      u_treble: { value: 0 },
      u_rms: { value: 0 },
    }),
    []
  );

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return;

    const t = state.clock.elapsedTime;
    materialRef.current.uniforms.u_time.value = t;

    // Smooth interpolation for audio values
    const s = 0.15;
    materialRef.current.uniforms.u_bass.value += (bass - materialRef.current.uniforms.u_bass.value) * s;
    materialRef.current.uniforms.u_mid.value += (mid - materialRef.current.uniforms.u_mid.value) * s;
    materialRef.current.uniforms.u_treble.value += (treble - materialRef.current.uniforms.u_treble.value) * s;
    materialRef.current.uniforms.u_rms.value += (rms - materialRef.current.uniforms.u_rms.value) * s;

    // Slow rotation
    meshRef.current.rotation.y = t * 0.15;
    meshRef.current.rotation.x = Math.sin(t * 0.1) * 0.1;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.5, 8]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        wireframe
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Particle Ring ──────────────────────────────────────────────────────────────

function ParticleRing({ rms }: { rms: number }) {
  const ref = useRef<THREE.Points>(null);
  const count = 200;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2.5 + Math.random() * 0.5;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.05;
    const scale = 1 + rms * 0.3;
    ref.current.scale.setScalar(scale);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#a855f7"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// ── Exported Component ─────────────────────────────────────────────────────────

interface AudioReactiveOrbProps {
  bass?: number;
  mid?: number;
  treble?: number;
  rms?: number;
  /** 0-1 crowd energy: more listeners = more intense visuals */
  crowdEnergy?: number;
  className?: string;
}

export function AudioReactiveOrb({
  bass = 0,
  mid = 0,
  treble = 0,
  rms = 0,
  crowdEnergy = 0,
  className = '',
}: AudioReactiveOrbProps) {
  // Crowd energy amplifies audio values — more people, crazier visuals
  const energyMult = 1 + crowdEnergy * 0.8;
  const ampBass = Math.min(bass * energyMult, 1);
  const ampMid = Math.min(mid * energyMult, 1);
  const ampTreble = Math.min(treble * energyMult, 1);
  const ampRms = Math.min(rms * energyMult, 1);

  return (
    <div className={`w-full aspect-square max-w-md mx-auto ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.1 + crowdEnergy * 0.15} />
        <Orb bass={ampBass} mid={ampMid} treble={ampTreble} rms={ampRms} />
        <ParticleRing rms={ampRms} />
        {/* Second particle ring appears with crowd energy */}
        {crowdEnergy > 0.3 && <ParticleRing rms={ampRms * 0.7} />}
        <EffectComposer>
          <Bloom
            intensity={1.2 + ampRms * 2 + crowdEnergy * 1.5}
            luminanceThreshold={0.2 - crowdEnergy * 0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
