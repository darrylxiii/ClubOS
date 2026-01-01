import { useState, useCallback, useRef, useEffect } from 'react';

interface EnhancementSettings {
  brightness: number;      // -1 to 1
  contrast: number;        // 0 to 2
  gamma: number;           // 0.1 to 3
  saturation: number;      // 0 to 2
  autoEnhance: boolean;
}

interface LightAnalysis {
  averageLuminance: number;
  isLowLight: boolean;
  isDark: boolean;
  histogram: number[];
}

interface UseLowLightEnhancementReturn {
  isEnabled: boolean;
  isAutoMode: boolean;
  settings: EnhancementSettings;
  lightAnalysis: LightAnalysis | null;
  enhancedStream: MediaStream | null;
  enableEnhancement: (stream: MediaStream) => Promise<void>;
  disableEnhancement: () => void;
  setAutoMode: (auto: boolean) => void;
  adjustSettings: (settings: Partial<EnhancementSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: EnhancementSettings = {
  brightness: 0,
  contrast: 1,
  gamma: 1,
  saturation: 1,
  autoEnhance: true,
};

// WebGL shader for video enhancement
const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_gamma;
  uniform float u_saturation;
  
  vec3 adjustBrightness(vec3 color, float brightness) {
    return color + brightness;
  }
  
  vec3 adjustContrast(vec3 color, float contrast) {
    return (color - 0.5) * contrast + 0.5;
  }
  
  vec3 adjustGamma(vec3 color, float gamma) {
    return pow(color, vec3(1.0 / gamma));
  }
  
  vec3 adjustSaturation(vec3 color, float saturation) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luminance), color, saturation);
  }
  
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    vec3 rgb = color.rgb;
    
    // Apply enhancements in optimal order
    rgb = adjustGamma(rgb, u_gamma);
    rgb = adjustBrightness(rgb, u_brightness);
    rgb = adjustContrast(rgb, u_contrast);
    rgb = adjustSaturation(rgb, u_saturation);
    
    // Clamp to valid range
    rgb = clamp(rgb, 0.0, 1.0);
    
    gl_FragColor = vec4(rgb, color.a);
  }
`;

export function useLowLightEnhancement(): UseLowLightEnhancementReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [settings, setSettings] = useState<EnhancementSettings>(DEFAULT_SETTINGS);
  const [lightAnalysis, setLightAnalysis] = useState<LightAnalysis | null>(null);
  const [enhancedStream, setEnhancedStream] = useState<MediaStream | null>(null);

  const sourceStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (glRef.current && textureRef.current) {
      glRef.current.deleteTexture(textureRef.current);
    }
    if (glRef.current && programRef.current) {
      glRef.current.deleteProgram(programRef.current);
    }
  }, []);

  const initWebGL = useCallback((canvas: HTMLCanvasElement): boolean => {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn('WebGL not supported, falling back to 2D canvas');
      return false;
    }

    glRef.current = gl;

    // Compile shaders
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return false;

    // Create program
    const program = gl.createProgram();
    if (!program) return false;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link failed:', gl.getProgramInfoLog(program));
      return false;
    }

    programRef.current = program;
    gl.useProgram(program);

    // Set up geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set up texture coordinates
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1, 1, 1, 0, 0,
      0, 0, 1, 1, 1, 0,
    ]), gl.STATIC_DRAW);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;

    return true;
  }, []);

  const compileShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  const analyzeLighting = useCallback((video: HTMLVideoElement): LightAnalysis => {
    const analysisCanvas = document.createElement('canvas');
    const scale = 0.1; // Analyze at 10% resolution for performance
    analysisCanvas.width = video.videoWidth * scale;
    analysisCanvas.height = video.videoHeight * scale;
    
    const ctx = analysisCanvas.getContext('2d');
    if (!ctx) {
      return { averageLuminance: 0.5, isLowLight: false, isDark: false, histogram: [] };
    }

    ctx.drawImage(video, 0, 0, analysisCanvas.width, analysisCanvas.height);
    const imageData = ctx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
    const data = imageData.data;

    let totalLuminance = 0;
    const histogram = new Array(256).fill(0);
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalLuminance += luminance;
      histogram[Math.floor(luminance)]++;
    }

    const averageLuminance = totalLuminance / pixelCount / 255;
    const isLowLight = averageLuminance < 0.35;
    const isDark = averageLuminance < 0.15;

    return { averageLuminance, isLowLight, isDark, histogram };
  }, []);

  const calculateAutoSettings = useCallback((analysis: LightAnalysis): Partial<EnhancementSettings> => {
    const { averageLuminance, isDark } = analysis;
    
    if (!analysis.isLowLight) {
      return { brightness: 0, contrast: 1, gamma: 1, saturation: 1 };
    }

    // Calculate optimal enhancements based on lighting conditions
    const targetLuminance = 0.45;
    const luminanceDiff = targetLuminance - averageLuminance;

    let brightness = Math.min(0.3, luminanceDiff * 0.8);
    let gamma = 1 + (luminanceDiff * 1.5);
    let contrast = 1 + (luminanceDiff * 0.3);
    let saturation = 1 + (luminanceDiff * 0.2);

    if (isDark) {
      // More aggressive enhancement for very dark scenes
      brightness = Math.min(0.4, brightness * 1.5);
      gamma = Math.min(2.5, gamma * 1.3);
      contrast = Math.min(1.4, contrast);
    }

    // Clamp values to safe ranges
    gamma = Math.max(0.5, Math.min(2.5, gamma));
    brightness = Math.max(-0.2, Math.min(0.5, brightness));
    contrast = Math.max(0.8, Math.min(1.5, contrast));
    saturation = Math.max(0.8, Math.min(1.3, saturation));

    return { brightness, contrast, gamma, saturation };
  }, []);

  const renderFrame = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!gl || !program || !video || !canvas || video.paused || video.ended) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    // Update canvas size if needed
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // Upload video frame to texture
    gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    // Set uniforms
    const currentSettings = settings;
    gl.uniform1f(gl.getUniformLocation(program, 'u_brightness'), currentSettings.brightness);
    gl.uniform1f(gl.getUniformLocation(program, 'u_contrast'), currentSettings.contrast);
    gl.uniform1f(gl.getUniformLocation(program, 'u_gamma'), currentSettings.gamma);
    gl.uniform1f(gl.getUniformLocation(program, 'u_saturation'), currentSettings.saturation);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [settings]);

  const enableEnhancement = useCallback(async (stream: MediaStream): Promise<void> => {
    cleanup();

    sourceStreamRef.current = stream;

    // Create video element to receive source stream
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    videoRef.current = video;

    await video.play();

    // Create output canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvasRef.current = canvas;

    // Initialize WebGL
    const webglSuccess = initWebGL(canvas);
    if (!webglSuccess) {
      console.warn('WebGL initialization failed');
      setEnhancedStream(stream);
      setIsEnabled(true);
      return;
    }

    // Create output stream
    const outputStream = canvas.captureStream(30);
    
    // Copy audio tracks
    stream.getAudioTracks().forEach(track => {
      outputStream.addTrack(track);
    });

    setEnhancedStream(outputStream);
    setIsEnabled(true);

    // Start render loop
    renderFrame();

    // Start lighting analysis
    analysisIntervalRef.current = setInterval(() => {
      if (video && !video.paused) {
        const analysis = analyzeLighting(video);
        setLightAnalysis(analysis);

        if (isAutoMode && settings.autoEnhance) {
          const autoSettings = calculateAutoSettings(analysis);
          setSettings(prev => ({ ...prev, ...autoSettings }));
        }
      }
    }, 1000);
  }, [cleanup, initWebGL, renderFrame, analyzeLighting, calculateAutoSettings, isAutoMode, settings.autoEnhance]);

  const disableEnhancement = useCallback(() => {
    cleanup();
    setIsEnabled(false);
    setEnhancedStream(null);
    setLightAnalysis(null);
    setSettings(DEFAULT_SETTINGS);
  }, [cleanup]);

  const setAutoMode = useCallback((auto: boolean) => {
    setIsAutoMode(auto);
    setSettings(prev => ({ ...prev, autoEnhance: auto }));
    
    if (!auto) {
      // Reset to defaults when disabling auto mode
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const adjustSettings = useCallback((newSettings: Partial<EnhancementSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    isEnabled,
    isAutoMode,
    settings,
    lightAnalysis,
    enhancedStream,
    enableEnhancement,
    disableEnhancement,
    setAutoMode,
    adjustSettings,
    resetSettings,
  };
}
