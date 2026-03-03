

## Plan: Add Compressed Twitter GIF for Dual-Image Social Previews

The user has uploaded a compressed GIF (`LIVE_LIKE_BENNY_COMMENT_OS_Instagram-bericht_45_7.gif`) to use as the Twitter-specific preview image (under 5MB). This enables the dual GIF strategy: full-size GIF for `og:image`, compressed GIF for `twitter:image`.

### Changes

1. **Copy uploaded GIF** to `public/og-image-twitter.gif`

2. **Update `index.html`** — change `twitter:image` from `og-image.gif` → `og-image-twitter.gif`

3. **Update 5 component files** — same swap for `twitter:image` tag only:
   - `src/pages/PartnerFunnel.tsx`
   - `src/pages/Blog.tsx`
   - `src/pages/BlogCategory.tsx`
   - `src/pages/CandidateOnboarding.tsx`
   - `src/components/blog/BlogSchema.tsx`

4. **Update `.lovable/plan.md`** to reflect the dual-GIF strategy

### After deploy
- Click "Update" in publish menu
- Use [X Card Validator](https://cards-dev.twitter.com/validator) to force re-scrape

