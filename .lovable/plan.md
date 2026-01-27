
Goal
- Fix Google OAuth so that after signing in on bytqc.com the user ends up in the app (e.g. /home or /oauth-onboarding) instead of landing back on /auth with no session.
- Also address the current production build failure (Node “heap out of memory”), which is likely caused by overly large bundles from certain imports used on /auth.

What’s happening (root cause)
1) The OAuth callback is being “cleaned” too early in src/pages/Auth.tsx:
   - On the OAuth return, the URL contains critical query parameters (typically code, state, etc.) that the auth client uses to exchange for a session.
   - The current effect detects state and calls:
     - window.history.replaceState({}, '', '/auth')
   - That can remove the OAuth code/state from the URL before the auth library finishes exchanging it for a session.
   - Result: no session is created, so the user remains on /auth (appears as “redirected back to /auth again”).

2) There is also a strong chance your custom “state” parameter conflicts with the auth system’s own use of state for PKCE/CSRF.
   - handleGoogleAuth passes queryParams: { …, state }
   - Many auth flows treat state as reserved and managed by the auth client; overriding it can break the exchange.

3) Production build currently fails with “JavaScript heap out of memory”.
   - A common trigger in Vite builds is importing “react-icons” packs (even a single icon import can pull in large subgraphs depending on configuration).
   - src/pages/Auth.tsx imports FaGoogle from react-icons/fa, which is a likely contributor.
   - Fixing that should reduce build memory pressure.

Plan (implementation steps)
A) Fix OAuth callback handling so the code exchange can complete
1. Update src/pages/Auth.tsx OAuth callback effect (the useEffect that calls handleOAuthCallback):
   - Stop clearing the URL immediately when state exists.
   - Instead:
     - Detect if the URL looks like an OAuth return (e.g. has “code=” or “access_token=” or “error=”).
     - If error is present: show toast, clear any local “pending invite” state, then clean URL to /auth.
     - If code is present:
       - Call supabase.auth.exchangeCodeForSession(window.location.href) (or the appropriate method supported by your auth client version).
       - Only after exchange succeeds (or after a short wait + getSession confirms session exists), then clean the URL to /auth (or to a neutral route) to remove the code from the address bar.
   - This ensures the session is established before we remove the callback parameters.

2. Remove the custom CSRF “state” usage that conflicts with provider state:
   - In handleGoogleAuth (and Apple/LinkedIn handlers if present):
     - Remove queryParams.state.
     - Keep provider-safe params like access_type/prompt.
   - If you still want additional “defense-in-depth” correlation:
     - Use a non-reserved param name (e.g. tqc_invite, tqc_flow) where supported, or store correlation in localStorage and verify after session exists (not before).

3. Make post-login navigation deterministic
   - The existing onboarding check useEffect navigates to /oauth-onboarding if onboarding_completed_at is missing, else /home.
   - We’ll ensure this runs only after:
     - loading === false
     - session exists
     - and we’re not mid-MFA
   - Add robust error handling around the profile fetch:
     - If the profiles query errors, log it and route to /oauth-onboarding (safe default) or show a discreet “We couldn’t complete sign-in. Try again.” message, depending on desired UX.
   - Avoid any code path that calls window.history.replaceState before session exchange is complete.

B) Reduce build memory usage to fix the production build OOM
4. Replace react-icons usage on /auth
   - Replace import { FaGoogle } from "react-icons/fa" with a lightweight alternative:
     - Prefer lucide-react icons already in use (e.g. a simple “G” icon / brand mark) or a small inline SVG for Google.
   - This typically reduces bundle size substantially and helps Vite build within memory limits.

5. (If still needed) Further bundle slimming on Auth route
   - Confirm other heavy imports are already lazy-loaded (OAuthDiagnostics already is).
   - Ensure any large, rarely used UI components on Auth are dynamically imported only when needed (e.g. OTP UI only when in verification state).

C) Verification checklist (what we’ll test after implementing)
6. Test on bytqc.com:
   - Click “Continue with Google”
   - Complete Google consent
   - Confirm you land on:
     - /oauth-onboarding (if profile onboarding isn’t complete) OR
     - /home (if onboarding is complete)
   - Confirm you are not returned to /auth unless you explicitly sign out.

7. Test on preview domain:
   - Same flow; confirm stable sign-in behavior without looping.

8. Confirm build succeeds
   - Re-run production build; verify no OOM.
   - If OOM persists, we’ll identify the next heaviest import(s) and reduce them similarly.

Notes / constraints
- Your backend URL allow list + Site URL appear correct from the screenshots; this is now primarily a frontend callback handling issue.
- Lovable Cloud supports Google OAuth; other providers shown in the UI may not work depending on backend support. We won’t change that unless you ask.

De-scope option (if you want the simplest, most reliable fix)
- Remove the custom oauthCsrfProtection layer entirely for OAuth and rely on the auth system’s built-in PKCE/state protections. This reduces risk of breaking the exchange and simplifies maintenance.

Acceptance criteria
- After completing Google OAuth on bytqc.com, user ends up authenticated and routed to /home or /oauth-onboarding within 1–2 seconds.
- No repeated landing on /auth after successful OAuth.
- Production build completes without Node heap OOM.