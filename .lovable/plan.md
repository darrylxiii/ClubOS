

# Add Rainbow Effect to "Get Started" Button

## Change

Replace the standard `Button` with the `RainbowButton` component on the Phase A "Get Started" CTA. The `RainbowButton` already has a black background with a rainbow border glow -- exactly matching "rainbow effect" + "black button".

## Implementation

### File: `src/components/partner-funnel/FunnelSteps.tsx`

1. Add import at top: `import { RainbowButton } from "@/components/ui/rainbow-button";`

2. Replace the Phase A button (lines 486-493):
   - **From**: `<Button variant="primary" onClick={handleEmailCapture} className="w-full min-h-[44px] text-base">`
   - **To**: `<RainbowButton onClick={handleEmailCapture} className="w-full min-h-[44px] text-base">`
   - Close tag changes from `</Button>` to `</RainbowButton>`

That is the only change. The `RainbowButton` component is already black with white text and an animated rainbow border glow -- no modifications needed to the component itself.

