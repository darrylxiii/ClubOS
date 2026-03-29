export default `
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec2 iMouse;
    uniform float time;
    uniform vec2 resolution;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(random(i), random(i + vec2(1.0, 0.0)), u.x),
        mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      // normalize coords to -1..1 on short side
      vec2 uv    = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
      vec2 mouse = (iMouse      - 0.5 * resolution.xy) / resolution.y;
      float t     = time * 0.1;

      // ripple around mouse
      float d = length(uv - mouse);
      float ripple = 1.0 - smoothstep(0.0, 0.3, d);

      // rotation
      float angle = t * 0.5;
      mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      vec2 p = rot * uv;

      // ink patterns
      float pattern = fbm(p * 3.0 + t);
      pattern -= fbm(p * 6.0 - t * 0.5) * 0.3;
      pattern += ripple * 0.5;

      // color mix
      vec3 c1 = vec3(0.1, 0.0, 0.2);
      vec3 c2 = vec3(0.8, 0.2, 0.4);
      vec3 highlight = vec3(1.0, 0.9, 0.7);

      vec3 color = mix(c1, c2, smoothstep(0.4, 0.6, pattern));
      float hl = pow(smoothstep(0.6, 0.8, pattern), 2.0);
      color = mix(color, highlight, hl);

      gl_FragColor = vec4(color, 1.0);
    }
`;
