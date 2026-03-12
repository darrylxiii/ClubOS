

# Auth Page Polish — Shader Speed, Card Size, Transparency + UI/UX Audit

## User Requests (Direct)

### 1. Card less transparent
Currently uses `.glass` which applies `bg-card/70` (70% opacity). Change to `bg-card/85` for more solidity while keeping the glassmorphic depth.

### 2. Card wider
Currently `max-w-xl` (576px). On a 1408px viewport this looks small. Change to `max-w-2xl` (672px) for a more generous layout.

### 3. Shader animation slower
Currently `uniforms.time.value += 0.05` per frame. Reduce to `+= 0.015` (3x slower) for a calmer, more ambient feel.

---

## UI/UX Audit Findings (Post-Shader Integration)

### 4. Input contrast is poor against shader bleed-through
The inputs use default styling. With the vivid shader behind glass, they need the `.glass-input` class to ensure readability and visual cohesion. All `Input` elements and the `AssistedPasswordConfirmation` inputs should use `glass-input` styling.

### 5. Logo visibility on dark shader
The dark-mode logo (white) renders fine, but the light-mode logo may clash with bright shader areas. Add a subtle `drop-shadow` to the logo container so it always reads clearly against the animated background.

### 6. "Request Access" and "Forgot Password" links lack contrast
These text buttons use `text-foreground/80` and `text-foreground/70` which can disappear against the shader. Bump to `text-foreground/90` and add `hover:underline` for better affordance.

### 7. OTP input slots lack glass treatment
The verification/MFA OTP slots use default borders which look disconnected from the glassmorphic card. They need a subtle `backdrop-blur` and border treatment.

### 8. Alert boxes (lockout, invite invalid) clash with glass aesthetic
The red/green alerts use flat `bg-destructive/10` which looks cheap on glass. Wrap with `backdrop-blur-sm` for cohesion.

### 9. Card content padding asymmetry
`CardHeader` has `pt-12 pb-8` but `CardContent` has `px-8 pb-10` — the horizontal padding should match the header for visual alignment. Standardize to `px-10`.

---

## Implementation

### Files Changed

| File | Changes |
|------|---------|
| `src/components/auth/ShaderAnimation.tsx` | Slow animation: `+= 0.015` instead of `+= 0.05` |
| `src/pages/Auth.tsx` | Card: `max-w-2xl`, `bg-card/85` override; inputs: add `glass-input`; links: increase contrast; padding: standardize `px-10`; logo: add drop-shadow |

