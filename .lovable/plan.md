
<context>
Current symptom (per your latest note):
- Booking page opens on Lovable preview, but availability call fails with: “Failed to load available times: Failed to fetch”.
- Same booking flow works on Vercel now.

What this strongly implies:
- The browser request is failing only in the Lovable preview environment, not because of the booking link itself.
- The most likely differentiator is runtime configuration (backend URL / publishable key) and/or caching/worker behavior differences between environments.

Key code facts:
- `src/integrations/supabase/client.ts` explicitly warns that in some “preview” modes the env vars may not be set, and falls back to a placeholder URL/key.
- `src/services/availability.ts` uses `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` for the direct `fetch()` fallback. If those are missing or wrong, you can end up with a browser-level `TypeError: Failed to fetch`.
- The PWA Workbox rules currently hardcode a single backend domain (`https://dpju...supabase.co/...`). If the preview environment ever differs (or a placeholder is being used), these rules won’t match and the SW could interfere unexpectedly.
</context>

<diagnosis-hypothesis>
The Lovable preview is sometimes running without the correct build-time env vars, causing:
1) `supabase` client to be instantiated with the placeholder URL/key, and/or
2) `fetchGetAvailableSlotsDirect()` to build a request to an invalid backend, resulting in “Failed to fetch”.

Vercel works because you explicitly set env vars there, so the same code behaves correctly.

Therefore the fix should make availability calls obtain backend config robustly even when `import.meta.env` is missing/partial in preview.
</diagnosis-hypothesis>

<implementation-plan>
<phase name="1) Make availability config robust (works even if VITE_* is missing)">
1. Update `src/services/availability.ts` to resolve backend URL/key using a layered approach:
   - Primary: `import.meta.env.VITE_SUPABASE_URL` + `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
   - Fallback: read from the instantiated client (`supabase`) if available (SupabaseClient exposes the URL internally; in many versions it’s `supabase.supabaseUrl` and key is stored internally as well).
   - If neither is available (true misconfiguration), throw a clear error like `availability_missing_backend_config` (not a vague “Failed to fetch”).

2. Ensure both transport paths use the same resolved config:
   - `invokeGetAvailableSlots(...)` continues to use `supabase.functions.invoke(...)` (best path).
   - `fetchGetAvailableSlotsDirect(...)` uses the resolved baseUrl + publishableKey and sends both:
     - `apikey: publishableKey`
     - `Authorization: Bearer ${publishableKey}`

Acceptance criteria:
- In Lovable preview, availability calls no longer depend solely on `import.meta.env` being present.
- If config is missing, we get a precise error message in logs (and a calm user message), not a generic fetch failure.

Notes:
- This keeps the publishable key client-side (which is intended to be public), and does not introduce private secrets.
</phase>

<phase name="2) Fix service worker caching rules to match all backend domains reliably">
1. Update `vite.config.ts` Workbox `runtimeCaching` rules to avoid hardcoding a single backend hostname for function calls.
   - Replace:
     - `^https://dpju...supabase.co/functions/v1/.*`
   - With a broader-but-safe pattern such as:
     - `^https://.*\\.supabase\\.co/functions/v1/.*`
   - Keep `handler: 'NetworkOnly'` so booking availability is never cached.

2. Do the same for REST rules if needed (optional, but recommended for consistency):
   - `^https://.*\\.supabase\\.co/rest/v1/.*` with `NetworkFirst` is fine, but keep a short TTL.

Acceptance criteria:
- Preview/published/alternate domains all bypass caching for backend function calls.
- No environment-specific mismatch where the SW caches or blocks requests due to hostname differences.

Risk/Trade-off:
- Broader URL patterns slightly increase the chance we match other backend domains (still constrained to `*.supabase.co` and specific paths), which is acceptable and safer than being too narrow.
</phase>

<phase name="3) Improve observability on booking pages (without clutter)">
1. In `UnifiedDateTimeSelector.tsx`, enhance logging when availability fails:
   - Log a structured payload (safe) containing:
     - whether env vars were present
     - whether fallback config was used
     - which transport failed (invoke vs direct fetch)
     - error category (timeout / http status / network)
2. Keep user toast calm:
   - “Availability temporarily unreachable. Please refresh.”
   - Include a short internal debug code (e.g., `AVAIL_CFG_01`) only in logs (not necessarily in UI).

Acceptance criteria:
- Next time anything regresses, we can pinpoint if it’s config missing vs real network vs backend error.
</phase>

<phase name="4) Verification checklist (Lovable preview specifically)">
1. Open Lovable preview: `/book/darryl`
2. Confirm month indicators load (calls month-range availability).
3. Click multiple dates; confirm slot fetch returns data or clean “No available times”.
4. Confirm network requests show POST to `/functions/v1/get-available-slots` with 200 responses (or readable JSON errors), and no browser-level “Failed to fetch”.

If still failing after phases 1–2:
- Inspect the exact failing request URL and response headers to confirm whether the browser is blocking due to missing CORS headers from a gateway-level 401/403.
</phase>
</implementation-plan>

<files-to-change>
- `src/services/availability.ts` (robust config resolution + consistent headers)
- `vite.config.ts` (generalize Workbox URL patterns for function calls)
- `src/components/booking/UnifiedDateTimeSelector.tsx` (better diagnostics/logging on failure)
</files-to-change>

<de-scope (to keep this tight)>
- No database schema changes.
- No changes to how booking links are created or stored.
- No changes to reCAPTCHA behavior (you stated it’s configured + required, and this issue is availability fetching).
</de-scope>
