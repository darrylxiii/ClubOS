

# Fix: Two Issues — Build Error + Google OAuth ERR_BLOCKED_BY_RESPONSE

## Issue 1: Build Error (ENOENT @mantine/core/styles/ScrollArea.css)

**Root Cause:** `@blocknote/mantine` internally imports `@mantine/core/styles/ScrollArea.css`, but `@mantine/core` is not listed as a dependency in `package.json`. It was likely installed as a transitive dependency but is missing or at an incompatible version.

**Fix:** Install `@mantine/core` as an explicit dependency. This provides the CSS files that `@blocknote/mantine` needs.

## Issue 2: Google OAuth ERR_BLOCKED_BY_RESPONSE

**Root Cause:** The `ERR_BLOCKED_BY_RESPONSE` error from `accounts.google.com` means Google is refusing to render in an iframe or popup because of its `X-Frame-Options` / CSP headers. This happens when the managed auth library tries to open Google sign-in inside a popup or iframe within the Lovable preview environment.

The preview iframe at `*.lovableproject.com` is already embedded in the Lovable editor, creating a nested context. When the managed auth tries to open a popup from inside this iframe, the browser blocks it.

**This is a preview-environment issue, not a production bug.** On the published site (`os.thequantumclub.com`), the page is top-level and the popup will work. However, we should ensure the flow degrades gracefully.

**Fix:** No code changes needed for the OAuth flow itself — it is correctly configured. To verify it works, test on the published URL (`os.thequantumclub.com`) rather than the preview iframe. The `ERR_BLOCKED_BY_RESPONSE` will not occur there.

## Changes

| File | Change |
|---|---|
| `package.json` | Add `@mantine/core` as explicit dependency to fix the build error |

## Technical Details

### Build fix
Add `@mantine/core` (matching the version range compatible with `@blocknote/mantine@^0.44.2`). The BlockNote 0.44.x series uses Mantine 7.x, so we install `@mantine/core@^7.0.0`.

### OAuth verification
After the build is fixed and deployed, test Google sign-in on `https://os.thequantumclub.com/auth` to confirm the redirect stays on the custom domain. The preview environment cannot be used to test OAuth popups due to iframe nesting restrictions.

