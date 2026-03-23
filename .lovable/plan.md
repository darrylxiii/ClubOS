
Goal: make Advanced Partner Provisioning impossible to fail silently, especially for the Password flow.

Audit summary (what I found)
- The provisioning backend function is available, but there are no user-attempt logs from this stuck flow, which indicates the submit is being blocked client-side before the function call.
- You confirmed the failing path is:
  - Step 4 click behavior: “Nothing happens”
  - Access method: “Password”
- In current UI flow, Step 3 does not hard-validate before moving to Step 4, so an invalid password can reach Review.
- Final submit currently relies on `form.trigger()` + immediate `form.formState.errors` reads, which can produce weak/late feedback and feel like a no-op.

Implementation plan (step-by-step)

1) Replace silent final validation with explicit `handleSubmit(onValid, onInvalid)`
- File: `src/components/admin/PartnerProvisioningModal.tsx`
- Change final submit path to use RHF `handleSubmit`.
- `onInvalid(errors)` will always fire with concrete error data.
- In `onInvalid`:
  - show a blocking toast with clear message
  - set a visible inline error summary state
  - auto-navigate to the correct step
- This removes the “click and nothing happens” behavior entirely.

2) Add robust field→step routing + recursive first-error extraction
- File: `src/components/admin/PartnerProvisioningModal.tsx`
- Add a deterministic `FIELD_TO_STEP` map and a helper that safely extracts first human-readable error from nested RHF errors.
- If a field cannot be mapped, default user to Step 3 for password-related flows and still show summary + toast.

3) Validate each step before advancing (not only at final submit)
- Files:
  - `src/components/admin/partner-provisioning/steps/ContactStep.tsx`
  - `src/components/admin/partner-provisioning/steps/CompanyStep.tsx`
  - `src/components/admin/partner-provisioning/steps/AccessStep.tsx`
- Convert each `onNext` to guarded progression:
  - Step 1: validate contact fields
  - Step 2: validate company fields based on mode
  - Step 3: validate access fields; if `provisionMethod === 'password'`, enforce min 12 before allowing Review
- This catches issues at source and prevents hidden errors from accumulating.

4) Make Review errors always visible/reactive
- File: `src/components/admin/partner-provisioning/steps/ReviewStep.tsx`
- Subscribe to form errors reactively (via form-state subscription pattern) and render a persistent error panel.
- Add “Fix now” links per error that jump directly to the relevant step.

5) Tighten password UX for the known failing path
- Files:
  - `src/components/admin/partner-provisioning/steps/AccessStep.tsx`
  - `src/components/admin/partner-provisioning/useProvisionForm.ts`
- Keep backend schema rule (>=12), but also add immediate inline helper + requirement checklist in Step 3.
- Disable “Review” until password rule passes when Password method is selected.

6) Add submit-state instrumentation and safe fallback feedback
- File: `src/components/admin/PartnerProvisioningModal.tsx`
- Add explicit attempt state + submit lifecycle markers:
  - “Validating…”
  - “Submitting…”
  - “Blocked by validation”
- Ensure every blocked path produces either a toast or inline error (never silent return).

7) Verification pass after implementation
- Password path with invalid password: blocked on Step 3 with visible reason.
- Password path with valid password: reaches Step 4 and calls provisioning.
- Existing-company and new-company paths: both show clear errors and step jump when invalid.
- Confirm backend invocation appears in logs when final submit is valid.

Files to update
- `src/components/admin/PartnerProvisioningModal.tsx`
- `src/components/admin/partner-provisioning/steps/ContactStep.tsx`
- `src/components/admin/partner-provisioning/steps/CompanyStep.tsx`
- `src/components/admin/partner-provisioning/steps/AccessStep.tsx`
- `src/components/admin/partner-provisioning/steps/ReviewStep.tsx`
- `src/components/admin/partner-provisioning/useProvisionForm.ts`
