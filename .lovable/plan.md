

# Partner Provisioning Modal -- Rebuild to 100/100

This plan transforms the current 778-line monolith into a modular, validated, accessible, and operationally complete provisioning experience befitting a 0.1% recruitment club.

---

## What Changes

### 1. Architecture: Break the Monolith

Split `PartnerProvisioningModal.tsx` (778 lines) into focused sub-components:

| New File | Responsibility |
|---|---|
| `PartnerProvisioningModal.tsx` | Shell: dialog, step orchestration, form context |
| `steps/ContactStep.tsx` | Name, email, phone, verification toggles |
| `steps/CompanyStep.tsx` | Existing vs new company, domain auto-provisioning |
| `steps/AccessStep.tsx` | Auth method, welcome message, strategist assignment |
| `steps/ReviewStep.tsx` | Full summary card with edit-back links per section |
| `ProvisionSuccessView.tsx` | Post-provision actions (copy link, view company, add another) |
| `useProvisionForm.ts` | `react-hook-form` + `zod` schema, replaces manual useState |

### 2. Validation: Zod + react-hook-form

Replace the 20+ manual `useState` fields and ad-hoc `toast.error` checks with a single Zod schema:

- Email: proper RFC format, max 255 chars
- Full name: trimmed, 2-100 chars
- Phone: optional, E.164 validated via `react-phone-number-input`
- Company name: 2-100 chars when creating new
- Temporary password: min 12 chars, at least 1 uppercase + 1 number (when password method selected)
- Domain: valid hostname regex
- Inline field errors displayed beneath each input (no more toast-only validation)

### 3. Missing Data: Collect What Matters for a 0.1% Club

Add fields the current modal lacks but the backend and business need:

| Field | Where | Why |
|---|---|---|
| **Fee structure** (fee_type, placement_fee_percentage, placement_fee_fixed) | Company step | Partners pay fees -- capture upfront so finance is ready from day one |
| **Payment terms** (default_payment_terms_days) | Company step | Net-30/60/90 agreed at onboarding |
| **Estimated roles per year** | Company step | Sizing the partnership, already in `partner_requests` |
| **Strategist assignment** | Access step | Already in the hook/backend but missing from the UI |
| **LinkedIn URL** | Contact step | Standard for executive recruitment verification |
| **Website URL** | Company step | Already on the `companies` table, not collected |
| **NDA acknowledgment** toggle | Review step | Already in `partner_requests.agreed_nda` |

### 4. UX: Executive Concierge Experience

- **4-step wizard** (Contact, Company, Access, Review) instead of 3 -- add a dedicated Review step so admins confirm everything before provisioning
- **Step labels** in the progress bar (not just numbered circles)
- **Auto-fill from partner_requests**: When opened from the Admin Partner Requests tab (via prefillData), also pull `industry`, `company_size`, `website`, `linkedin_url`, `estimated_roles_per_year` from the request record
- **Duplicate detection**: Real-time check on email blur -- show inline warning "This email is already registered" with a link to the existing profile, instead of waiting for a 409 from the backend
- **Company search**: Replace the static Select dropdown with a searchable combobox (cmdk is already installed) so admins can quickly find among hundreds of companies
- **Unsaved changes guard**: Prompt on close if any field has been modified
- **Focus management**: Auto-focus the first empty required field when navigating to a step

### 5. Accessibility

- `aria-label` on all interactive elements
- `aria-current="step"` on the active step indicator
- Focus trap within the dialog (already from Radix, but ensure step transitions move focus)
- Keyboard: Enter advances to next step, Escape closes with unsaved-changes check
- Screen reader announcements on step change ("Step 2 of 4: Company Configuration")

### 6. Backend Edge Function Hardening

Update `supabase/functions/provision-partner/index.ts`:

- **CORS fix**: Add the missing `x-supabase-client-*` headers (same pattern as the Fathom fix)
- **Fee data**: Accept and write `fee_type`, `placement_fee_percentage`, `placement_fee_fixed`, `default_payment_terms_days`, `website_url`, `linkedin_url` to the `companies` table during creation
- **Idempotent company creation**: If a company with the same domain already exists, offer to link instead of failing silently
- **Strategist list endpoint**: The modal needs to fetch available strategists -- add a simple query in the hook (user_roles where role = 'strategist')

### 7. Post-Provision Actions (Success View)

Upgrade the current success view:

- Copy magic link (existing)
- Copy invite code (existing)
- **Open partner's profile** in a new tab
- **Send a WhatsApp welcome** (if phone provided, link to WhatsApp compose)
- **Schedule onboarding call** (link to booking page if cal integration exists)
- **Provision another** (existing, but reset form properly)

---

## Files to Create / Modify

| File | Action |
|---|---|
| `src/components/admin/partner-provisioning/useProvisionForm.ts` | Create -- Zod schema + react-hook-form hook |
| `src/components/admin/partner-provisioning/steps/ContactStep.tsx` | Create |
| `src/components/admin/partner-provisioning/steps/CompanyStep.tsx` | Create |
| `src/components/admin/partner-provisioning/steps/AccessStep.tsx` | Create |
| `src/components/admin/partner-provisioning/steps/ReviewStep.tsx` | Create |
| `src/components/admin/partner-provisioning/ProvisionSuccessView.tsx` | Create |
| `src/components/admin/PartnerProvisioningModal.tsx` | Rewrite -- thin orchestrator importing the above |
| `src/hooks/usePartnerProvisioning.ts` | Update -- add strategist fetching, duplicate check |
| `supabase/functions/provision-partner/index.ts` | Update -- CORS fix, accept fee/payment fields, write to company |
| `src/pages/Companies.tsx` | Minor -- pass extended prefillData from partner_requests |

---

## Implementation Sequence

1. Create the Zod schema and form hook (`useProvisionForm.ts`)
2. Build the 4 step components, each consuming the form context
3. Build the success view
4. Rewrite the modal shell to orchestrate steps
5. Update the edge function for CORS + new company fields
6. Update the provisioning hook for duplicate checks and strategist fetching
7. Wire prefillData enrichment from partner_requests in Companies.tsx

---

## What This Achieves

- **Architecture**: 778-line monolith becomes 7 focused files, each under 150 lines
- **Validation**: Zod schema prevents bad data at the form level, not just toast messages
- **Data completeness**: Fee structure, payment terms, LinkedIn, strategist -- everything finance and ops need from day one
- **UX**: Searchable company picker, duplicate detection, unsaved-changes guard, 4-step review
- **Accessibility**: WCAG AA compliant with proper focus management and ARIA
- **Backend**: CORS fixed, new fields persisted, idempotent operations
- **Tone**: Calm, precise, zero clutter -- every field justified, no optional noise

