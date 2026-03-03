

## Plan: Replace Twitter GIF with Valid 630×630 Asset

The user has uploaded a new GIF (`LIVE_LIKE_BENNY_COMMENT_OS_1200_x_630_px_630_x_630_px_1.gif`) that appears to be **630×630px** — above X's 300px minimum width requirement and likely under 5MB.

### Changes

1. **Copy uploaded GIF** to `public/og-image-twitter-v3.gif` (cache-busting filename)

2. **Update `index.html`** — change `twitter:image` from `og-image-twitter-v2.gif` → `https://os.thequantumclub.com/og-image-twitter-v3.gif`

3. **Update 5 component files** — same swap for `twitter:image`:
   - `src/pages/PartnerFunnel.tsx`
   - `src/pages/Blog.tsx`
   - `src/pages/BlogCategory.tsx`
   - `src/pages/CandidateOnboarding.tsx`
   - `src/components/blog/BlogSchema.tsx`

4. **Fix dimension tags** — update `og:image:width`/`og:image:height` from `1200`/`630` to `432`/`540` to match the actual `og-image.gif` dimensions

### After deploy
- Use [X Card Validator](https://cards-dev.twitter.com/validator) to force re-scrape
- Post a fresh tweet to verify

### Technical note
X's `summary_large_image` works with square images (they get cropped to fit the card). The 630×630 GIF meets the minimum 300px width requirement and should render correctly. Since this is a real uploaded file (not a generated binary), it will be a valid GIF unlike the corrupted v2.

