

## Dashboard Greeting: Typewriter + CAPS Inter

### What to change

**File: `src/pages/Home.tsx`** (lines 73–78)

1. Import `useAnimatedText` hook
2. Build the greeting string as uppercase: `WELCOME BACK, DARRYL`
3. Pass it through `useAnimatedText(greeting, "")` for character-by-character typewriter
4. Style the `<h1>` with `font-inter uppercase tracking-wider text-2xl sm:text-3xl font-bold` — sized down from the current `text-3xl sm:text-4xl font-black` to avoid being too large while keeping the all-caps Inter look clean
5. Add a blinking cursor span (`|`) that fades out when animation completes, using a simple opacity check (animated text length === full text length)
6. Subtitle stays static, no animation

### Sizing rationale
- Current: `text-3xl sm:text-4xl font-black` — uppercase at this size is visually shouting
- Proposed: `text-2xl sm:text-3xl font-bold` — uppercase Inter at this weight reads confident but not oversized. `tracking-wider` adds the spacing that uppercase Inter needs to breathe

### Code sketch
```tsx
import { useAnimatedText } from "@/hooks/useAnimatedText";

// Inside component:
const greeting = t('home.welcomeBack', { 
  name: profile?.full_name?.split(' ')[0] || 'Member' 
}).toUpperCase();
const animatedGreeting = useAnimatedText(greeting, "");
const isComplete = animatedGreeting.length === greeting.length;

// JSX:
<h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider font-inter">
  {animatedGreeting}
  <span className={cn(
    "inline-block w-[2px] h-[1em] bg-foreground ml-0.5 align-baseline transition-opacity duration-500",
    isComplete ? "opacity-0" : "animate-pulse opacity-100"
  )} />
</h1>
```

Single file edit, ~10 lines changed.

