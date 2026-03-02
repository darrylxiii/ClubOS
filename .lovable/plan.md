
## What I found in the deep audit (Avatar Control only)

1. **Francis is missing photo in backend data**
   - `Francis Hagendoorn` currently has `avatar_url = null`.
   - Recent sync log shows: **Apify returned profile data but `pic: false`**.
   - The fallback path for missing photos depends on `PROXYCURL_API_KEY`, and that secret is **not configured**, so that fallback never runs.

2. **Anne has a valid stored photo, but UI can still show fallback initials**
   - `Anne Brouwer` has a valid `avatar_url` in the account table.
   - The image file exists in storage and has normal metadata (`image/jpeg`, valid size).
   - This points to a **frontend image refresh/cache issue** (same URL reused; browser can keep stale failure/cache state).

3. **Current sync logic can unintentionally clear avatars**
   - In `sync-avatar-linkedin/index.ts`, if no new photo is found, update payload still sets `avatar_url` to `null`.
   - That means a re-sync can erase an existing photo if provider temporarily fails to return one.

---

## Implementation plan to fix Francis + Anne reliably

### 1) Harden backend sync so avatars don’t disappear
**File:** `supabase/functions/sync-avatar-linkedin/index.ts`

- Change update behavior to **never overwrite `avatar_url` with null**.
  - Only set `avatar_url` when a new image was successfully found/stored.
  - If no image found, keep existing value unchanged.
- Keep current primary provider path.
- Keep fallback provider path, but run it whenever photo is missing (not gated by non-critical conditions).
- Add explicit logging branch when fallback key is missing so failures are transparent.

**Outcome:** existing photos are preserved; temporary provider misses don’t wipe avatars.

---

### 2) Fix frontend avatar rendering/cache behavior
**Files:**
- `src/components/avatar-control/AvatarAccountCard.tsx`
- `src/components/avatar-control/ViewAvatarProfileDialog.tsx`
- (new helper) `src/lib/avatar-url.ts` (or equivalent utility)

- Build avatar URL with versioning from `last_synced_at`:
  - `avatarSrc = appendQuery(avatar_url, { v: last_synced_at })`
- Use that computed URL in `AvatarImage`.
- Add minimal retry-on-error behavior (single retry token) so transient image load failures recover.
- Keep initials fallback only after real load failure.

**Outcome:** Anne’s stored image renders consistently after sync/update events.

---

### 3) Resolve Francis specifically (post-code validation flow)
- Re-run sync for Francis after backend hardening.
- If provider still returns no photo:
  - Use fallback provider path (requires configuring the missing fallback key), or
  - Add a controlled manual override path in edit dialog as guaranteed recovery.

**De-scope for this pass:** do not build full upload UI unless Francis still cannot be resolved by hardened auto-sync + fallback.

---

### 4) Verification checklist (must pass)

1. **Data checks**
   - Francis has non-null `avatar_url`.
   - Anne keeps non-null `avatar_url` after re-sync.
   - No other account loses avatar on re-sync.

2. **UI checks (Avatar Control)**
   - Grid card shows photo for Francis and Anne.
   - Profile dialog shows same photo for both.
   - Hard refresh still shows photos (cache-safe behavior works).

3. **Behavior checks**
   - Re-sync account with existing photo + temporary scrape miss does **not** clear avatar.
   - Logs clearly indicate source used (primary/fallback) and why fallback did/didn’t run.

---

## Technical notes

- Root cause split:
  - **Francis:** provider data gap + fallback secret missing.
  - **Anne:** data is present; rendering/cache invalidation is weak.
- This plan addresses both backend integrity and frontend display reliability, so it fixes current incidents and prevents recurrence.
