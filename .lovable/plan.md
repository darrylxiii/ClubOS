

# Fix: Use GIF Only — Remove Broken PNG References

## What's Actually Wrong

The only real problem is that `og-image.png` is a **blank white image** and it's set as the **primary** `og:image` tag. Platforms like X, LinkedIn, and Slack pick the first `og:image` — and get a white box. The GIF works fine as an asset, it just never gets used because the blank PNG takes priority.

## The Fix (simple)

**Make `og-image.gif` the only `og:image` and `twitter:image` everywhere.** Remove all references to the broken `og-image.png` from social meta tags.

| File | Change |
|---|---|
| `index.html` | Remove PNG `og:image` block (lines 154-158), make GIF the sole `og:image`, keep `twitter:image` as GIF |
| `src/pages/PartnerFunnel.tsx` | Replace `og-image.png` → `og-image.gif` in og:image |
| `src/pages/Blog.tsx` | Remove PNG og:image line, keep GIF only |
| `src/pages/BlogCategory.tsx` | Replace `og-image.png` → `og-image.gif` |
| `src/pages/CandidateOnboarding.tsx` | Replace `og-image.png` → `og-image.gif` |
| `src/components/blog/BlogSchema.tsx` | Update fallback from `og-image.png` → `og-image.gif` |

That's it. 6 files, same change in each: GIF only, no PNG.

## Platform Behavior Note

- **LinkedIn/Slack/iMessage**: Will show the first frame of the GIF as a static image — this is fine, the first frame of your GIF is already a strong branded visual.
- **Discord/Telegram**: Will show the full animation.
- **X (Twitter)**: May show the first frame or drop the image if it exceeds their size limit (~5MB). If X still shows no image after deploying, the only fix would be to provide a smaller version of the GIF — but let's try this first and see.

## After Deploy

1. Click **"Update"** in the publish menu
2. Use [X Card Validator](https://cards-dev.twitter.com/validator) to force re-scrape of `os.thequantumclub.com`

