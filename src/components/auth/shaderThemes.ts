/**
 * Auth page shader themes — each provides a unique full-screen WebGL backdrop.
 * The vertex shader is shared; only the fragment + uniforms differ.
 */export interface ShaderTheme {
  id: string;
  /** i18n key under 'auth' namespace */
  labelKey: string;
  /** i18n key for the philosophical/mood subtitle */
  subtitleKey: string;
  /** Tailwind gradient string for the glowing preview orb */
  colorGradient: string;
  /** Async function to fetch the raw GLSL fragment shader code */
  loadFragmentShader: () => Promise<string>;
}

/* ── shared vertex shader ─────────────────────────────────── */
export const VERTEX_SHADER = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

/* ── 1. Paper Warp — from 21st.dev ─────────────── */
export const paperWarp: ShaderTheme = {
  id: 'paperWarp',
  labelKey: 'themeSelector.paperWarp',
  subtitleKey: 'themeSelector.paperWarpDesc',
  colorGradient: 'from-blue-400 to-indigo-600',
  loadFragmentShader: () => import('./shaders/paperWarp').then(m => m.default)
};

/* ── 2. Neon Vortex — from 21st.dev ─────────────── */
export const neonVortex: ShaderTheme = {
  id: 'neonVortex',
  labelKey: 'themeSelector.neonVortex',
  subtitleKey: 'themeSelector.neonVortexDesc',
  colorGradient: 'from-fuchsia-500 to-purple-700',
  loadFragmentShader: () => import('./shaders/neonVortex').then(m => m.default)
};

/* ── 3. Celestial Ink ─────────────────────────────── */
export const celestialInk: ShaderTheme = {
  id: "celestialInk",
  labelKey: "themeSelector.celestialInk",
  subtitleKey: "themeSelector.celestialInkDesc",
  colorGradient: 'from-pink-500 to-rose-700',
  loadFragmentShader: () => import('./shaders/celestialInk').then(m => m.default)
};

/* ── 4. Quantum Shimmer — The Original ───────────────────── */
export const quantumShimmer: ShaderTheme = {
  id: "quantumShimmer",
  labelKey: "themeSelector.quantumShimmer",
  subtitleKey: "themeSelector.quantumShimmerDesc",
  colorGradient: 'from-amber-300 to-orange-500',
  loadFragmentShader: () => import('./shaders/quantumShimmer').then(m => m.default)
};

/* ── 5. Cosmic Voyage — Launch into orbit ──────────────────── */
export const cosmicVoyage: ShaderTheme = {
  id: "cosmicVoyage",
  labelKey: "themeSelector.cosmicVoyage",
  subtitleKey: "themeSelector.cosmicVoyageDesc",
  colorGradient: 'from-orange-500 to-red-700',
  loadFragmentShader: () => import('./shaders/cosmicVoyage').then(m => m.default)
};

/* ── Export ─────────────────────────────────────────────── */
export const SHADER_THEMES: ShaderTheme[] = [
  paperWarp,
  neonVortex,
  celestialInk,
  quantumShimmer,
  cosmicVoyage,
];

export const DEFAULT_THEME_ID = 'cosmicVoyage';

export function getPersistedThemeId(): string {
  // Always Random Initial Theme Generator on Visit
  const randomIndex = Math.floor(Math.random() * SHADER_THEMES.length);
  return SHADER_THEMES[randomIndex].id;
}

export function persistThemeId(id: string): void {
  // No-op for now. If we wanted, we could store it in sessionStorage 
  // to avoid it jumping around when interacting with other links, 
  // but it's currently held in local state by AuthVisualShell anyway.
}
