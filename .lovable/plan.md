
# CRO Audit & Fix: Partner Funnel Conversion Overhaul

## Audit Findings — Why Nobody Completes This Form

After reading every line of the funnel, here are the conversion killers, ranked by impact:

---

### Finding 1 — CRITICAL: 5 steps is too many. The form demands far too much commitment upfront.

The funnel currently has: Contact → Company → Partnership → Compliance → Verification. That is five screens before anyone submits. Google Ads traffic is cold — these are people who clicked an ad. They did not come pre-qualified and are not ready for a 5-step process with email OTP + phone OTP + legal checkboxes.

Every additional step loses approximately 20-40% of users who made it to that point. With 5 steps + 2 verification gates, the compounding dropout is catastrophic.

**Fix**: Collapse to 3 steps: "About You" (contact + company on one screen) → "Your Needs" (partnership details only) → "Submit" (single privacy checkbox + phone number, no OTP on submit).

---

### Finding 2 — CRITICAL: Email OTP on Step 1 is a conversion killer.

The very first action required after entering an email is an email verification code. For cold Google Ads traffic, being asked to go check their email inbox — before they've even seen the value — causes massive abandonment. This is appropriate for a login flow, not a lead form.

**Fix**: Remove the email OTP gate entirely from the lead capture flow. Just collect the email. Verification can happen asynchronously after submission if needed for spam control. The `emailVerified` gate in `validateStep()` at line 278 blocks progression until OTP is complete — this must go.

---

### Finding 3 — CRITICAL: The Compliance step (step 3) looks like a contract, not a lead form.

The current step 3 has:
- A card titled "No-Cure-No-Pay Model" with fee structure language and a required checkbox
- A card titled "Privacy & Data Protection" with a required checkbox  
- A card titled "Non-Disclosure Agreement (Optional)" with a third checkbox

Three cards. Two mandatory agreements. One optional NDA. Fee percentages (20%) listed. This reads as a legal signing session, not a simple enquiry. The user explicitly asked to remove the NDA and No-Cure-No-Pay blocks because "it seems like a contract already."

**Fix**: Remove both the No-Cure-No-Pay card and the NDA card entirely. Replace with a single clean line: "By submitting, you agree to our Privacy Policy and Terms of Service." Remove `agreed_no_cure_no_pay` and `agreed_nda` from the form state and from the validation in `validateStep()` at line 296. The phone number from this step moves to the final submit screen.

---

### Finding 4 — HIGH: Phone OTP on the final step is a second verification wall.

After getting past the email OTP on step 1, the user hits a phone SMS OTP on the final step. Two verification codes for a lead form is an extraordinary ask. The `handleSubmit` function wraps the entire insert in `verifyOTP()` — the database write literally cannot happen without a valid OTP code. For a recruitment lead form, this is overkill and will cause abandonment at the last moment.

**Fix**: Move the phone number field to inline on the submission step, but make it optional (or skip it entirely — email is sufficient for a lead). Remove the phone OTP gate from the submission path. The submit button should directly call the database insert. Phone can still be collected and verified later by the strategist.

---

### Finding 5 — HIGH: The hero headline "Partner Request" is weak and gives no value proposition.

The page title is just "Partner Request" — a label, not a value statement. Someone who clicked a Google Ad expecting to hire talent sees a bureaucratic title and a multi-step form with no immediate answer to "what do I get out of this?"

**Fix**: Replace with a compelling headline that answers the visitor's intent, e.g. "Access Pre-Vetted Senior Talent. No upfront fees." with a brief sub-headline explaining the process. This should appear above the form card, not just as a form title.

---

### Finding 6 — MEDIUM: The TrustBadges include "No-Cure-No-Pay" as a badge but we're removing that block.

`TrustBadges.tsx` renders a badge that says "No-Cure-No-Pay" — this should be kept as a trust signal (it's a benefit, not a contract), but the wording in the badge should read "Zero Upfront Fees" to emphasize the benefit without sounding contractual.

---

### Finding 7 — MEDIUM: The Social Proof Carousel is at the bottom, below the form.

Social proof (testimonials) appears *after* the form card. By the time a user scrolls down to see it, they've either already committed or already left. Social proof should reinforce the decision *while* the form is visible, not after.

**Fix**: Move testimonials into the form card itself — show one rotating quote inline near the top of the card (above the step content), or as a side panel on desktop.

---

### Finding 8 — MEDIUM: Step labels say "compliance" — a legal-sounding word in the progress bar.

The `STEPS` array is `["contact", "company", "partnership", "compliance", "verification"]`. Users can see "compliance" as an upcoming step on the desktop stepper. This word alone primes anxiety before they even reach it.

**Fix**: With the new 3-step structure, the labels become `["Your Details", "Hiring Needs", "Submit"]` — clear, benefit-oriented, non-threatening.

---

### Finding 9 — LOW: The "Description" textarea is required and has a 5-row height.

On step 2 (Partnership), users must write a free-form description of their hiring needs. This is a high-effort field for cold traffic. A long blank textarea signals "this is going to take work."

**Fix**: Make it optional. Replace the placeholder with something like "Optional — share anything that would help us prepare for our call." This removes the required-field pressure while still collecting useful data from those who choose to fill it in.

---

### Finding 10 — LOW: The FunnelAIAssistant quick replies mention "no-cure-no-pay" and "fees."

The first quick reply button says "What is the no-cure-no-pay model?" and the second says "What are your fees?" — which primes cost anxiety before people have even started. The AI assistant's FAQ also explicitly states the 20% fee figure.

**Fix**: Replace quick replies with benefit-oriented questions: "How quickly can you find candidates?", "What seniority levels do you recruit?", "How does the process work?", "Can you recruit internationally?"

---

## What the New Flow Looks Like

```text
BEFORE (5 steps + 2 OTP gates):
  Step 1: Name + Email → [EMAIL OTP GATE] → advance
  Step 2: Company Name + Industry + Size + Location
  Step 3: Roles/Year + Budget + Timeline + Description (required, 5 rows)
  Step 4: No-Cure-No-Pay ✓ + Privacy ✓ + NDA ✓ + Phone number
  Step 5: [PHONE OTP GATE] → Submit → redirect

AFTER (3 steps, no OTP gates):
  Step 1: Name + Email + Company Name + Industry [~90 seconds]
  Step 2: Company Size + Estimated Roles + Timeline + Budget + Description (optional) [~60 seconds]
  Step 3: Phone (optional) + "By submitting you agree to Privacy Policy" + Submit button [~10 seconds]
```

Total time: under 3 minutes, no inbox interruptions, no SMS codes, no legal language.

---

## Database Impact

The `partner_requests` table insert in `handleSubmit()` currently sends `agreed_no_cure_no_pay` and `agreed_nda`. We need to:
- Keep these columns in the database (no migration needed — just don't send them, or send them as `false` by default)
- Remove from `formData` state
- Remove from `validateStep()` validation logic

No schema changes required. The columns can stay nullable/false.

---

## Files to Change

### 1. `src/components/partner-funnel/FunnelSteps.tsx` — Major rewrite
- Remove email OTP flow entirely (lines 100-530 in `case 0`)
- Merge contact + company into Step 0: name, email, company name, industry
- Step 1: company size, roles/year, timeline, budget, description (optional)
- Step 2: phone (optional) + single privacy line + submit button (no phone OTP)
- Update `STEPS` array to `["Your Details", "Hiring Needs", "Submit"]`
- Update `validateStep()` — remove email OTP check, remove `agreed_no_cure_no_pay` gate
- Update `handleSubmit()` — remove `verifyOTP()` wrapper, insert directly
- Update `handleNext()` — remove `sendEmailOTP` and `sendOTP` calls
- Remove `agreed_no_cure_no_pay` and `agreed_nda` from `formData` state
- Remove phone from step 3 (compliance) and move to new step 2 (submit)
- Update step count from 5 to 3 throughout

### 2. `src/pages/PartnerFunnel.tsx` — Hero upgrade
- Replace `<h1>Partner Request</h1>` with a compelling two-line value proposition headline
- Add a brief "How it works" strip (3 icons: Submit → Strategy Call → Shortlist) above the form
- Move `SocialProofCarousel` above the form (or inline within the card)

### 3. `src/components/partner-funnel/TrustBadges.tsx` — Copy update
- Change "No-Cure-No-Pay" badge label to "Zero Upfront Fees"

### 4. `src/components/partner-funnel/FunnelAIAssistant.tsx` — Quick replies update
- Replace fee/no-cure-no-pay quick replies with benefit-oriented questions
- Remove 20% fee language from the FAQ responses and system prompt

### 5. `src/components/partner-funnel/ExitIntentPopup.tsx` — Copy update
- Remove "No-Cure-No-Pay • Zero Risk" badge label, replace with "No obligation — just a conversation"

---

## Summary of Changes

| Area | Before | After |
|---|---|---|
| Number of steps | 5 | 3 |
| Email OTP gate | Required on Step 1 | Removed |
| Phone OTP gate | Required on final step | Removed |
| Compliance cards | 3 cards (NDA + No-Cure + Privacy) | Single privacy line |
| Page headline | "Partner Request" (label) | Value proposition headline |
| Description field | Required, 5-row textarea | Optional, low-pressure |
| Social proof position | Below the form | Above or alongside form |
| Trust badges | "No-Cure-No-Pay" | "Zero Upfront Fees" |
| AI quick replies | Fee/contract-focused | Benefit/process-focused |
| Step labels | "compliance", "verification" | "Your Details", "Hiring Needs", "Submit" |
