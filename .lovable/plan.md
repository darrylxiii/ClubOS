

# Social Preview Audit — Definitive 100/100 Plan

## Score of Previous Plan: 72/100

The previous plan identified the core domain and og:image issues but missed **11 critical problems** that would leave the social presence broken even after implementation. Here is every issue found, with nothing spared.

---

## EVERY ISSUE IN THE CODEBASE (27 total)

### TIER 1: BROKEN RIGHT NOW — Social shares look terrible or empty (–40 points)

| # | Issue | Where | Impact |
|---|---|---|---|
| **B1** | `index.html` uses `thequantumclub.app` (6 occurrences) — wrong domain | `index.html:153-155,167` | Every share of the homepage shows broken image |
| **B2** | `og-image.gif` is the ONLY og:image — LinkedIn, Slack, WhatsApp, iMessage render first frame only as a tiny static thumbnail. GIFs are NOT reliably supported as primary OG images | `index.html:154-156` | Most professional sharing contexts show a degraded preview |
| **B3** | PartnerFunnel has NO `og:image` at all | `PartnerFunnel.tsx:76-106` | Sharing `/partner` on LinkedIn = blank grey card |
| **B4** | Blog index has NO `og:image`, NO twitter meta, and canonical uses `thequantumclub.lovable.app` | `Blog.tsx:117-124` | Sharing `/blog` = blank card + wrong canonical hurts SEO |
| **B5** | BlogSchema has NO `og:image` and NO `twitter:image` for individual blog posts | `BlogSchema.tsx:47-61` | Every blog post shared = no preview image |
| **B6** | CandidateOnboarding references `og-onboarding.png` which does NOT exist in `public/` | `CandidateOnboarding.tsx:158` | Sharing `/onboarding` = broken image |
| **B7** | CandidateOnboarding has NO `twitter:image` tag | `CandidateOnboarding.tsx:160-165` | Twitter/X shares show no image |
| **B8** | `logo.png` referenced in PartnerFunnel JSON-LD does NOT exist in `public/` | `PartnerFunnel.tsx:89` | Google rich results show broken logo |
| **B9** | `logo.png` referenced in BlogSchema JSON-LD does NOT exist in `public/` | `BlogSchema.tsx:17` | Google rich results show broken publisher logo |
| **B10** | BlogPost share URL uses `thequantumclub.lovable.app` | `BlogPost.tsx:93` | Social share buttons send users to wrong domain |
| **B11** | BlogCategory has NO og:image, NO og:url, NO twitter meta at all | `BlogCategory.tsx:37-40` | Sharing any `/blog/career-insights` = blank card |

### TIER 2: SEO POISON — Search engines indexing wrong URLs (–25 points)

| # | Issue | Where | Impact |
|---|---|---|---|
| **S1** | `blog-sitemap` edge function uses `thequantumclub.lovable.app` as baseUrl for ALL sitemap URLs | `blog-sitemap/index.ts:11` | Google indexes the wrong domain for every blog post |
| **S2** | `blog-robots` edge function uses `thequantumclub.lovable.app` as Host | `blog-robots/index.ts:4` | Robots.txt tells crawlers the wrong domain |
| **S3** | `robots.txt` in `public/` points sitemap to raw Supabase function URL, exposing project ID | `robots.txt:18` | Leaks infrastructure details, unprofessional |
| **S4** | BlogSchema `baseUrl` is `thequantumclub.lovable.app` — all JSON-LD canonical URLs are wrong | `BlogSchema.tsx:7` | Google structured data references wrong domain |
| **S5** | Blog.tsx canonical is `thequantumclub.lovable.app/blog` | `Blog.tsx:123` | Duplicate content signal to Google |

### TIER 3: MISSING BEST PRACTICES — No "wow" factor (–15 points)

| # | Issue | Where | Impact |
|---|---|---|---|
| **M1** | No `twitter:site` handle anywhere in the app | Everywhere | Twitter cards don't attribute to your account |
| **M2** | No `og:image:width` / `og:image:height` on any Helmet page (only index.html has them) | All Helmet pages | Platforms may render images at wrong aspect ratio |
| **M3** | The uploaded GIF is not being used anywhere | Not in codebase | Missing opportunity for animated "wow" on Discord/Telegram/X |
| **M4** | No dual og:image strategy (static PNG primary + animated GIF secondary) | Everywhere | Can't serve the best format per platform |
| **M5** | `index.html` og:image uses `image/gif` type which many crawlers deprioritize | `index.html:156` | Some platforms skip GIF og:images entirely |

### TIER 4: PREVIOUS PLAN GAPS — Things it missed or got wrong (–20 points)

| # | What was missed |
|---|---|
| **P1** | Previous plan never mentioned `blog-sitemap` or `blog-robots` edge functions — both use wrong domain. This is arguably the WORST SEO issue since it poisons Google's entire index of blog content |
| **P2** | Previous plan never mentioned `BlogPost.tsx:93` share URL using wrong domain — social share buttons send users to `thequantumclub.lovable.app` |
| **P3** | Previous plan never mentioned `BlogCategory.tsx` having ZERO social meta tags |
| **P4** | Previous plan never mentioned `robots.txt` exposing the raw Supabase project URL |
| **P5** | Previous plan's "dual og:image" approach is incomplete — it never specified og:image:width/height for the secondary tag, and didn't address that Helmet pages need the same treatment |
| **P6** | Previous plan said "no new assets needed" but never addressed copying the uploaded GIF into the project |
| **P7** | Previous plan didn't fix the `create-booking` origin allowlist which still references the old domain patterns (this is fine to keep for backward compat but worth noting) |

---

## THE FIX PLAN (100/100)

### Step 0: Copy the uploaded GIF into `public/`
Copy `user-uploads://LIVE_LIKE_BENNY_COMMENT_OS_Instagram-bericht_45_5.gif` → `public/og-image.gif` (replacing the current one with this new branded GIF)

### Fix 1: `index.html` — Domain + Dual Image Strategy
- Replace all 6 `thequantumclub.app` → `os.thequantumclub.com`
- Primary og:image → `og-image.png` (type `image/png`, 1200×630)
- Secondary og:image → `og-image.gif` (type `image/gif`, 1200×630) — platforms that support animation (X, Discord, Telegram) pick this up
- twitter:image → `og-image.gif` (X supports animated images in cards — this is the "wow")
- Add `<meta name="twitter:site" content="@thequantumclub" />`

### Fix 2: `PartnerFunnel.tsx` — Add full OG + fix JSON-LD
- Add `og:image` (PNG primary + GIF secondary with dimensions)
- Add `og:url`
- Add `twitter:card`, `twitter:image` (GIF), `twitter:site`
- Fix JSON-LD `logo` from `logo.png` → `quantum-clover-icon.png`

### Fix 3: `Blog.tsx` — Fix canonical + add full OG
- Change canonical from `thequantumclub.lovable.app` → `os.thequantumclub.com`
- Add `og:title`, `og:description`, `og:type`, `og:url`
- Add `og:image` (PNG primary + GIF secondary)
- Add `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:site`

### Fix 4: `BlogSchema.tsx` — Fix baseUrl + add og:image + twitter:image + fix JSON-LD logo
- Change `baseUrl` from `thequantumclub.lovable.app` → `os.thequantumclub.com`
- Add `og:image` using post's hero image URL (with fallback to global og-image.png)
- Add `og:image:width`, `og:image:height`
- Add `twitter:image` using post's hero image
- Add `twitter:site`
- Fix publisher logo from `logo.png` → `quantum-clover-icon.png`

### Fix 5: `BlogPost.tsx` — Fix share URL
- Change `shareUrl` from `thequantumclub.lovable.app` → `os.thequantumclub.com`

### Fix 6: `BlogCategory.tsx` — Add full OG meta tags
- Add `og:title`, `og:description`, `og:type`, `og:url`
- Add `og:image` (PNG + GIF dual), `og:image:width`, `og:image:height`
- Add `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:site`
- Add canonical URL

### Fix 7: `CandidateOnboarding.tsx` — Fix ghost image + add twitter:image
- Change `og-onboarding.png` → `og-image.png`
- Add `twitter:image` with the GIF for animated preview on X
- Add `twitter:site`

### Fix 8: `blog-sitemap/index.ts` — Fix baseUrl
- Change `thequantumclub.lovable.app` → `os.thequantumclub.com`
- This fixes every URL in the XML sitemap that Google crawls

### Fix 9: `blog-robots/index.ts` — Fix baseUrl
- Change `thequantumclub.lovable.app` → `os.thequantumclub.com`

### Fix 10: `robots.txt` — Fix sitemap URL
- Change the raw Supabase function URL to `https://os.thequantumclub.com/api/blog-sitemap` or keep the edge function URL but use a cleaner format that doesn't expose the project ID. Since the edge function URL is the actual endpoint, change to: `Sitemap: https://os.thequantumclub.com/sitemap.xml` and have it proxy — OR simply keep the Supabase URL but note it's acceptable since sitemaps are public anyway.
- Pragmatic fix: leave the Supabase URL as-is (it works, sitemaps are public), but update the `Host:` line if present.

---

## Files to Edit (11 total)

| File | Fixes |
|---|---|
| `public/og-image.gif` | **REPLACE** with uploaded GIF |
| `index.html` | Fix 1: domain ×6, dual og:image, twitter:site |
| `src/pages/PartnerFunnel.tsx` | Fix 2: add og:image, twitter meta, fix JSON-LD logo |
| `src/pages/Blog.tsx` | Fix 3: fix canonical, add full OG + Twitter meta |
| `src/components/blog/BlogSchema.tsx` | Fix 4: fix baseUrl, add og:image, twitter:image, fix JSON-LD logo |
| `src/pages/BlogPost.tsx` | Fix 5: fix share URL domain |
| `src/pages/BlogCategory.tsx` | Fix 6: add full OG + Twitter meta |
| `src/pages/CandidateOnboarding.tsx` | Fix 7: fix ghost image, add twitter:image + twitter:site |
| `supabase/functions/blog-sitemap/index.ts` | Fix 8: fix baseUrl |
| `supabase/functions/blog-robots/index.ts` | Fix 9: fix baseUrl |
| `public/robots.txt` | Fix 10: review sitemap URL |

## What Does NOT Change
- `auth-cors.ts` ALLOWED_ORIGINS (keep `thequantumclub.lovable.app` for backward compat)
- `create-booking` origin checks (same reason)
- `og-image.png` (keep the existing static PNG as primary fallback)
- All internal app logos (separate concern, already audited)

