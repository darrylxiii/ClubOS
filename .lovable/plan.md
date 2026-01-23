
<context>
You’re seeing Vercel errors like:
- “404: NOT_FOUND … ID: fra1::…”
- And it happens on refresh / deep links (React Router routes), while the Lovable preview works.

You also note:
- bytqc.com (on Vercel) loads.
- thequantumclub.app “does not even load” because it’s still pointed at Lovable’s hosting/DNS.
</context>

<step-by-step diagnosis (what is happening and why)>
1) The “404: NOT_FOUND … fra1::…” error is Vercel’s standard response when it cannot find a matching file for the requested path.
   - In a Vite + React Router SPA, routes like `/auth`, `/home`, `/admin/exports`, etc. are not real files.
   - They must be rewritten to `/index.html` so the client router can take over.
   - Without a rewrite, refreshing `/auth` on Vercel becomes “try to serve /auth as a file” → 404.

2) Lovable preview typically serves the SPA in a way that already falls back to `index.html` for unknown routes, so React Router works even without extra config.
   - That’s why it “works in preview” but breaks on Vercel.

3) thequantumclub.app not loading is a separate issue from React Router:
   - That domain’s DNS is still pointing to Lovable (or otherwise not pointed at Vercel), so requests never reach your Vercel deployment.
   - Until DNS is moved, no amount of Vercel config will affect thequantumclub.app.

Conclusion:
- Vercel 404s on deep links are a routing rewrite issue (SPA fallback).
- thequantumclub.app not loading is a DNS/domain routing issue (it’s still tied to Lovable hosting records).
</step-by-step diagnosis>

<goals>
1) Make Vercel serve `index.html` for all non-asset routes so React Router works everywhere (including refresh and direct links).
2) Move `thequantumclub.app` DNS at Spaceship to Vercel so the domain actually points to the working Vercel deployment.
3) Avoid introducing new caching/boot-loop issues (especially with the PWA service worker).
</goals>

<implementation plan (code + configuration)>
<phase id="1" name="Add SPA rewrite configuration for Vercel">
Action:
- Add a `vercel.json` file at the project root that rewrites all routes to `/index.html`.

Recommended config (simple and reliable for SPAs):
- Rewrite everything except actual static files to `/index.html`.

Acceptance:
- Visiting `/auth` directly on Vercel loads the app (no Vercel 404).
- Refreshing `/home` or any protected route no longer yields “404: NOT_FOUND”.
</phase>

<phase id="2" name="Confirm Vercel build settings match Vite output">
In Vercel project settings:
- Framework preset: Vite (or “Other” but configured correctly)
- Build command: `npm run build`
- Output directory: `dist`

Acceptance:
- Deploy completes cleanly and serves the correct `dist/index.html` + `/assets/*`.
</phase>

<phase id="3" name="Ensure environment variables are set in Vercel">
In Vercel project Environment Variables (Production + Preview):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- Any other VITE_* values you rely on (e.g. PostHog key if used)

Why:
- Your frontend constructs backend-function URLs using `import.meta.env.VITE_SUPABASE_URL` (e.g. `/functions/v1/data-dump`).
- If these are missing or wrong in Vercel, you’ll see runtime failures that you might not see in Lovable preview.

Acceptance:
- Auth works.
- Admin exports page can call backend functions (even if export itself is still being tuned).
</phase>

<phase id="4" name="Point thequantumclub.app to Vercel (Spaceship DNS)">
This is the key to making thequantumclub.app load from Vercel.

On Spaceship DNS for `thequantumclub.app`:
- Apex/root (`@`) A record → `76.76.21.21` (Vercel)
- `www` CNAME → `cname.vercel-dns.com`

Also:
- Remove/replace any conflicting A/AAAA/CNAME records for `@` or `www` that currently point to Lovable/old infrastructure.
- Keep all email records (MX, SPF, DKIM, DMARC) intact.

Acceptance:
- In Vercel, domain verification passes.
- `https://thequantumclub.app` loads your Vercel deployment.
- Optional: `www.thequantumclub.app` redirects to the primary host (configured in Vercel).

Note:
- You do not need to move to Cloudflare for this. Spaceship is fine as DNS host as long as it supports these records.
- Cloudflare is optional if you want WAF/bot protection/advanced redirects, but it adds another layer (and mistakes there can cause “it works in one place but not another”).
</phase>

<phase id="5" name="PWA/service worker sanity check (prevent ghost caching bugs)">
Because your Vite config enables PWA only in production builds, Vercel will run with a service worker while Lovable preview may not.

We’ll validate:
- `sw.js` is being served correctly
- There isn’t an old service worker from the Lovable domain affecting the Vercel domain (should be isolated by origin, but we confirm)
- Asset caching strategy isn’t causing stale HTML/assets mismatch on Vercel

Acceptance:
- No boot loops
- No “stale build” behavior after redeploys
- Updates behave predictably
</phase>
</implementation plan>

<verification checklist (what you will test after changes)>
1) On Vercel domain (bytqc.com):
   - Open `/auth` directly in a new tab (should load).
   - Refresh on `/auth` and `/home` (should not 404).
2) In Vercel project settings:
   - Confirm `dist` output is served and `/assets/*` loads.
3) After DNS switch:
   - `thequantumclub.app` loads the same as bytqc.com.
   - HTTPS certificate is active on `thequantumclub.app`.
4) Optional but recommended:
   - Test one deep protected route directly (e.g. `/admin/exports`) after login.
</verification checklist>

<clarifications / decisions>
- Stay on Spaceship DNS for now. Move to Cloudflare only if you specifically want:
  - WAF / bot protection
  - Advanced redirects/rules
  - CDN caching controls
  - DDoS mitigation controls beyond defaults

If later you choose Cloudflare:
- You’d keep Spaceship as registrar, but change nameservers to Cloudflare and recreate DNS records there.
</clarifications / decisions>

<what I need from you to proceed cleanly>
1) Confirm: Is the Vercel project already set to serve a SPA (Vite) with output directory `dist`?
2) Confirm: Do you want `thequantumclub.app` to be the primary domain, with `www` redirecting to it?
3) If you can paste one URL that 404s on Vercel (e.g. `https://bytqc.com/auth`), I’ll tailor the rewrite rule to your exact structure (though the standard SPA rewrite will almost certainly solve it).
</what I need from you to proceed cleanly>

<de-scope (to keep this fast and safe)>
- We are not changing application logic yet.
- This is strictly deployment correctness: SPA rewrites + domain DNS pointing + env parity.
</de-scope>
