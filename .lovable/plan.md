

# Email Dump Audit and Fix Plan

## Current Score: 45/100

### Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | Edge function NOT registered in config.toml -- will not deploy | Critical |
| 2 | Calls non-existent `ai-proxy` instead of Lovable AI Gateway directly | Critical |
| 3 | `application_source: "sourced"` is not a valid enum value -- imports fail | Critical |
| 4 | Plain textarea strips HTML on paste -- LinkedIn hyperlinks are lost | Critical (your reported issue) |
| 5 | Sequential N+1 import queries -- slow for batch imports | Medium |
| 6 | No re-process button for failed dumps | Low |
| 7 | `as any` type casts for `job_email_dumps` (cosmetic but error-prone) | Low |

---

## Fixes

### Fix 1: Rich Paste Support (hyperlink extraction)

Replace the plain `<textarea>` with a paste handler that intercepts `onPaste`, reads `clipboardData.getData('text/html')`, and extracts all `<a href="...">` URLs alongside the plain text.

The edge function prompt will be updated to receive BOTH the plain text AND a list of extracted hyperlinks, so the AI can match names to LinkedIn URLs even when the email used hyperlinked names.

Frontend logic:
- On paste: grab HTML from clipboard, extract all anchor tags with `href` containing "linkedin.com"
- Prepend a "Detected hyperlinks" section to the raw content sent to the AI
- Keep the textarea for display (plain text) but store the enriched content

### Fix 2: Register function in config.toml

Add `[functions.parse-email-candidates]` with `verify_jwt = false` (auth is validated in code).

### Fix 3: Use Lovable AI Gateway directly

Replace the `ai-proxy` URL with the correct gateway: `https://ai.gateway.lovable.dev/v1/chat/completions` using `LOVABLE_API_KEY`.

### Fix 4: Fix application_source enum

Change `"sourced"` to `"other"` (closest valid enum value).

### Fix 5: Batch import optimization

Replace the sequential loop with parallel processing using `Promise.allSettled` for candidate profile creation and application insertion.

### Fix 6: Re-process button on failed dumps

Add a button in `EmailDumpHistory` that re-sends the raw_content to the edge function.

---

## Target Score: 100/100

After all fixes:
- Rich paste preserves hyperlinks (LinkedIn URLs extracted from HTML)
- Edge function deploys correctly and calls the right AI gateway
- Batch import works for 10+ candidates at once without errors
- Failed dumps can be re-processed
- Valid enum values used throughout

## Technical Details

### Files to modify:
1. `supabase/config.toml` -- add function entry
2. `supabase/functions/parse-email-candidates/index.ts` -- fix AI gateway URL, use LOVABLE_API_KEY, update prompt to handle hyperlinks
3. `src/components/jobs/email-dump/EmailDumpTab.tsx` -- add HTML paste handler, extract hyperlinks from clipboard
4. `src/components/jobs/email-dump/ExtractedCandidatesPreview.tsx` -- fix `application_source` enum, batch import
5. `src/components/jobs/email-dump/EmailDumpHistory.tsx` -- add re-process button

### Paste Handler Design

```text
onPaste event:
  1. e.clipboardData.getData('text/html') -> parse with DOMParser
  2. querySelectorAll('a[href]') -> extract all href values
  3. Filter for linkedin.com URLs, map to { text: anchor.textContent, url: href }
  4. e.clipboardData.getData('text/plain') -> set as textarea value
  5. Append extracted links metadata to content sent to AI
```

### Updated AI Prompt

The system prompt will instruct the model:
- "HYPERLINKS section contains URLs extracted from the email HTML. Match these to candidate names."
- This ensures names like "John Smith" that were hyperlinked to their LinkedIn profile get properly associated.

