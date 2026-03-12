

# Auth Page: Shader Background + Glassmorphic Card

## What's wrong now
- Card is `max-w-lg` (512px) — too narrow per user feedback
- Background uses `auth-mesh-bg` CSS gradient — user calls it ugly
- No glassmorphic styling on the card

## What we'll do

### 1. Create `ShaderAnimation.tsx` component
- Port the user's Three.js shader code into a React component
- Load Three.js from CDN dynamically (no package install needed)
- Renders a full-screen WebGL canvas with the mosaic/aurora shader effect
- Positioned `fixed inset-0 z-0` behind everything
- Includes cleanup on unmount (dispose renderer, cancel animation frame, remove resize listener)

### 2. Update `Auth.tsx`
- **Remove** `auth-mesh-bg` class from the container div
- **Widen** card from `max-w-lg` to `max-w-md` — wait, that's smaller. Looking at the screenshot the card appears cramped. Let me check: `max-w-lg` = 32rem = 512px, `max-w-xl` = 36rem = 576px. The user says "revert to original size" — I'll use `max-w-md` (28rem/448px) since the screenshot shows it narrower than expected... Actually the user says it's too narrow and wants it wider. I'll go with `max-w-xl` (576px) for better proportions.
- **Glassmorphic card**: Change card styling to `bg-card/70 backdrop-blur-[16px] border-border/50 shadow-glass-md` (using the `.glass` pattern from brand guidelines)
- **Add** `<ShaderAnimation />` as background layer inside the auth page, behind the card
- Container becomes `relative z-10` for the card, shader at `z-0`

### 3. Keep `auth-mesh-bg` CSS
- Don't delete it from `index.css` (might be used elsewhere), just stop using it on Auth page

## Files

| File | Action |
|------|--------|
| `src/components/auth/ShaderAnimation.tsx` | **Create** — Three.js shader background |
| `src/pages/Auth.tsx` | **Edit** — remove mesh bg, add shader, widen card, glassmorphic styling |

