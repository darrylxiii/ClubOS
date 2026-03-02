
# Partner Funnel Copy Audit: Every Word Scored

## Current Score: 52/100

The funnel works mechanically but reads like a mid-tier SaaS lead form, not a luxury executive recruitment platform. The copy mixes tones (desperate urgency vs. calm discretion), contradicts itself in places, and defaults to generic SaaS phrasing instead of the brand voice: calm, discreet, competent.

---

## Audit by Surface (every visible string)

### A. Hero Section (PartnerFunnel.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| `Your shortlist of senior candidates, ready in 14 days.` | "ready in 14 days" is a hard promise that may not always hold. "Your shortlist" is possessive before they've done anything. Decent but reads like an ad headline, not a concierge. | `Senior talent, shortlisted for you within two weeks.` |
| `Tell us who you're looking for — we handle sourcing, screening, and coordination.` | "Tell us" is a command. "Sourcing, screening, and coordination" is a list of operational tasks — not a benefit. | `Describe the role. We handle the rest.` |
| `No upfront fees. No contracts. You only pay for results.` | Three negatives in a row. Defensive framing. "You only pay for results" is a cliche used by every contingency recruiter. | `No fees until you hire. No long-term contracts.` |
| Stepper: `Submit request` / `Strategy call` / `Receive shortlist` | "Submit request" sounds bureaucratic. "Strategy call" is jargon. "Receive shortlist" is passive. | `Share your brief` / `Speak with a strategist` / `Review your shortlist` |
| Mobile badge: `3 simple steps — no fees, no contracts` | Redundant with the line above it. "Simple" is a word that implies the alternative is complicated — unnecessary insecurity. | `Three steps. Under two minutes.` |

**Hero score: 45/100** — functional but generic. Reads like a staffing agency, not The Quantum Club.

---

### B. Step 0 — Your Details (FunnelSteps.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| Step label: `Your Details` | Fine but generic. Every form says this. | `About you` |
| Heading (pre-email): `Get your shortlist started` | "Get your X started" is SaaS growth-hack copy, not luxury. | `Begin your search` |
| Subtext: `Enter your work email to begin` | Instructional, cold. | `We will follow up at this address.` |
| Heading (post-email): `A few more details` | "A few more" signals friction. | `Tell us about your company` |
| Subtext: `Takes about 30 seconds` | Fine but could be more confident. | `This takes less than a minute.` |
| Label: `Work Email *` | The asterisk is SaaS convention. Not wrong, but not elite either. | `Work email` (remove asterisk; it's the only field — obviously required) |
| Placeholder: `jane@company.com` | Generic. "Jane" is a stand-in. | `you@yourcompany.com` |
| Label: `Full Name *` | Fine. | `Your name` |
| Placeholder: `Jane Smith` | Same generic name. | Remove placeholder entirely — the label is sufficient. |
| Label: `Company Name *` | Fine. | `Company` |
| Placeholder: `Acme Corp` | Cartoon company name. Feels unserious. | Remove placeholder. |
| Label: `Industry *` | Fine. | Keep. |
| Placeholder: `Select industry` | Fine. | `Select your industry` |
| Button: `Get Started` | Too casual for an executive audience. | `Continue` |
| Button (post-email): `Next: Your Hiring Needs` | Exposes internal step names. Feels like a wizard, not a conversation. | `Continue` |

**Step 0 score: 40/100** — reads like a product onboarding flow, not a private consultation intake.

---

### C. Step 1 — Hiring Needs (FunnelSteps.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| Step label: `Hiring Needs` | Functional but blunt. | `Your brief` |
| Heading: `Your hiring needs` | Same. | `Tell us what you are looking for` |
| Subtext: `Help us prepare for our first call` | Good intent but "Help us" puts the burden on them. | `So we can prepare for our conversation.` |
| Label: `Company Size *` | Fine. | Keep. |
| Placeholder: `Number of employees` | Redundant with the label. | `Select range` |
| Label: `Estimated Roles / Year` | Slash feels informal. "Estimated" hedges unnecessarily. | `Roles per year` |
| Placeholder: `e.g. 5` | Fine. | Keep. |
| Label: `When do you need to start?` | Good — conversational. | Keep. |
| Options: `Immediately` / `Within 1 month` / etc. | Fine but `Just exploring` is too casual for a luxury platform. | Change `Just exploring` to `No immediate need` |
| Label: `Approximate Annual Budget` | "Approximate" hedges. "Annual Budget" is vague — budget for what? | `Recruitment budget (annual)` |
| Placeholder: `Select range` | Fine. | Keep. |
| Label: `Anything else we should know?` | Good — conversational and inviting. | Keep. |
| Placeholder: `Optional — share anything that would help us prepare for our call. Roles you're hiring for, seniority levels, or challenges you're facing.` | Way too long for a placeholder. Disappears on first keystroke. This guidance should be helper text below the field, not a placeholder. | Placeholder: `Specific roles, seniority levels, or challenges...` — keep it short. |
| Label: `Location` | Ambiguous — location of what? The company? The roles? | `Headquarters location` (as the field name suggests) |
| Placeholder: `e.g. Amsterdam, Dubai, London` | Fine. | Keep. |

**Step 1 score: 55/100** — decent questions, but labels hedge too much and the textarea placeholder is a paragraph.

---

### D. Step 2 — Submit (FunnelSteps.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| Step label: `Submit` | Transactional. | `Review` |
| Heading: `Almost done` | "Almost done" is overused in every SaaS funnel on earth. | `Review and submit` |
| Subtext: `Add your phone number so we can reach you — or skip and we'll use email.` | "Skip and we'll use email" is awkward. Too many words. | `Optional. Helps us reach you faster.` |
| Label: `Phone Number (optional)` | Fine. | Keep. |
| Placeholder: `Add phone for faster response` | The placeholder is selling ("faster response"). Placeholders should be format hints, not pitches. | Remove placeholder — the PhoneInput has its own country selector and format. |
| Summary heading: `Your details` | Fine. | Keep. |
| Legal: `By submitting, you agree to our Privacy Policy and Terms of Service. No contracts, no upfront fees.` | "No contracts, no upfront fees" is repeated for the third time across the page. Feels like over-reassurance — the opposite of confidence. | `By submitting you agree to our Privacy Policy and Terms of Service.` |
| Button: `Submit — Free, No Obligation` | "Free, No Obligation" is late-night infomercial language. Catastrophic for a luxury brand. This is the single worst line in the entire funnel. | `Submit your brief` |
| Button (loading): `Submitting...` | Fine. | Keep. |
| Back button: `Back` | Fine. | Keep. |

**Step 2 score: 35/100** — "Submit — Free, No Obligation" alone tanks the score. Desperate language on the final CTA destroys trust.

---

### E. Availability Banner (FunnelSteps.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| `2/5 partner spots available this quarter` | "Partner spots" is artificial scarcity that a VP of Talent will see through instantly. X/5 is too specific — if it never changes, it's obviously fake. | `Limited availability this quarter` — or remove entirely. Scarcity tactics damage luxury trust. |

**Score: 25/100** — this is the most damaging single element. Manufactured urgency on a luxury platform.

---

### F. Trust Badges (TrustBadges.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| `GDPR compliant · 256-bit encrypted · No upfront fees` | "No upfront fees" again (4th repetition). "256-bit encrypted" — nobody verifies this and it sounds like a VPN ad. | `GDPR compliant · End-to-end encrypted · No upfront fees` — but reduce repetitions across the page. If the hero already says "No fees until you hire", remove it here: `GDPR compliant · End-to-end encrypted` |

**Score: 50/100** — functional but over-repeats.

---

### G. Exit Intent Popup (ExitIntentPopup.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| Title (step 0): `Before you go` | Generic. Every exit popup says this. | `A moment before you leave` |
| Body: `This takes under 60 seconds. No fees, no obligation — just a conversation about your hiring needs.` | "Under 60 seconds" contradicts "under two minutes" from elsewhere. "No fees, no obligation" is the 5th repetition. | `This takes less than two minutes — and there is no commitment involved.` |
| Bullet: `Under 60 seconds to complete` | Contradicts other estimates. | `Under two minutes to complete` |
| Bullet: `No contracts or upfront fees` | 6th repetition. | `No contracts required` |
| Bullet: `Curated shortlist within 14 days` | Fine. | `Shortlist delivered within two weeks` |
| Footer: `No obligation — just a conversation.` | 7th repetition of the no-obligation message. | Remove entirely. |
| CTA: `Get Started` | Fine for step 0. | Keep. |
| Title (mid-flow): `Don't lose your progress` | Threatening tone. | `Your progress is saved` |
| Body: `You're 67% through the application.` | "Application" implies they are being evaluated — wrong frame. They are the buyer, not the applicant. | `You are 67% through your brief.` |
| Bullet: `Progress saved locally` | "Locally" is a technical detail. | `Your progress is saved` |
| Bullet: `Your data is protected` | Vague. | `Data encrypted and private` |
| Bullet: `Only ~1 minute to complete` | Contradicts "60 seconds" from earlier variant. | `Less than a minute to finish` |
| Cancel: `Leave Anyway` | Passive-aggressive. "Anyway" implies judgment. | `Leave` |
| CTA (mid-flow): `Continue Application` | "Application" again — wrong word. They are not applying. They are briefing us. | `Continue` |

**Score: 30/100** — desperate, repetitive, and uses "application" framing which inverts the power dynamic. The partner is the buyer, not the applicant.

---

### H. Resume Dialog (ResumeFunnelDialog.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| Title: `Welcome back` | Fine. | Keep. |
| Body: `You have an incomplete partnership request saved.` | "Incomplete" is negative framing. "Partnership request" — they did not request a partnership; they were telling us about their hiring needs. | `You have a saved brief in progress.` |
| CTA: `Continue Where I Left Off` | Too long. | `Continue` |
| Cancel: `Start Fresh` | Fine. | Keep. |

**Score: 55/100** — mostly fine, one framing issue.

---

### I. Success Page (PartnershipSubmitted.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| Title: `Successfully Submitted Partner Request` | ALL CAPS + "Successfully Submitted" + "Partner Request" = bureaucratic government form energy. | `Your brief has been received` |
| Body: `Thank you for your interest in partnering with The Quantum Club. Your strategist is reviewing your request now.` | "Thank you for your interest" is a rejection letter opener. Every declined job applicant has read this phrase. | `A strategist is reviewing your brief and will be in touch within 24 hours.` |
| Company label: `Company: {name}` | Redundant — they know their own company name. | Remove. |
| CTA: `Book a Strategy Call` | Good. | Keep. |
| CTA: `Return to Website` | Fine. | `Visit our website` |
| ThemeToggle visible | Already removed from funnel but still present on success page. | Remove for consistency. |

**Score: 30/100** — the success page reads like a government receipt, not a luxury confirmation.

---

### J. Toast Messages (throughout FunnelSteps.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| `Please enter a valid work email` | Fine. | Keep. |
| `Please fill in all required fields` | Generic. | `Please complete the required fields.` |
| `Please enter a valid email address` | Redundant with the first. | Consolidate — keep only one email validation message. |
| `Please select your company size` | Fine. | Keep. |
| `Request submitted.` / `Your strategist will be in touch within 24 hours.` | Good. | Keep. |
| `Welcome back.` / `We've restored your progress.` | Good. | Keep. |
| `Submission failed` | Too blunt. | `Something went wrong. Please try again.` |
| Resume toast: `Resuming at step 2 of 3` | Exposes internals. | `Resuming where you left off.` |

**Score: 60/100** — mostly fine, a few rough edges.

---

### K. Reminder Emails (send-funnel-reminder)

| Current | Problem | Proposed |
|---------|---------|----------|
| Subject 1: `Your request is still waiting, {name}` | "Still waiting" personifies the request — awkward. | `Your brief is saved, {name}` |
| Subject 2: `Last chance to finish your request, {name}` | "Last chance" is aggressive urgency. | `Your saved progress expires soon, {name}` |
| Body 1: `You started a partnership request for {company} but didn't finish.` | "But didn't finish" is accusatory. | `You began a hiring brief for {company}. Your progress is saved.` |
| Body 2: `Your saved progress will be removed soon.` | Fine — factual urgency is acceptable. | Keep. |
| CTA 1: `Finish Your Request` | "Finish" implies they failed. | `Resume your brief` |
| CTA 2: `Complete Now` | Fine. | Keep. |
| CTA button color: `#C9A24E` (gold) | Gold accents are prohibited per brand guidelines. | Change to `#F5F4EF` (ivory) text on `#0E0E10` (eclipse) background — monochromatic. |
| Footer: `No upfront fees. No contracts. You only pay when we place a candidate.` | Repetition again, and "place a candidate" is recruiter jargon. | `No fees until you hire.` |

**Score: 40/100** — accusatory language and gold CTA violate brand.

---

### L. Confirmation Email (send-partner-request-received)

Already uses the branded email template system with proper tone. Minor issues:
- Uses gold accent color internally (EMAIL_COLORS.gold) — should be monochromatic per updated brand.
- "Your partner request has been received" — should be "Your brief has been received."
- "Request Received" status badge — should be "Brief Received."

**Score: 65/100** — mostly good, terminology and color alignment needed.

---

### M. QUIN Chat Assistant (FunnelAIAssistant.tsx)

| Current | Problem | Proposed |
|---------|---------|----------|
| Greeting: `Hi — I'm QUIN, The Quantum Club's AI assistant. Ask me anything about working with us.` | "Ask me anything" is too broad and casual. | `I am QUIN. Ask me about our process, timelines, or industries we serve.` |
| Quick reply: `How quickly can you find candidates?` | Fine. | Keep. |
| Quick reply: `What seniority levels do you recruit?` | Fine. | `What seniority levels do you cover?` |
| Quick reply: `How does the process work?` | Fine. | Keep. |
| Quick reply: `Can you recruit internationally?` | Fine. | `Do you recruit internationally?` |
| Header: `QUIN` / `Powered by QUIN` | "Powered by QUIN" under "QUIN" is redundant. | `QUIN` / `AI assistant` |
| Fallback: `I can help with that. Our team will give you a detailed answer during the strategy call — usually within 24 hours of submitting your request.` | Good. | Change "submitting your request" to "submitting your brief." |

**Score: 65/100** — mostly good. Greeting is too casual.

---

## Systemic Issues (across all surfaces)

1. **"No fees / no obligation / no contracts" repeated 7+ times.** Over-reassurance signals insecurity. A luxury brand states terms once and moves on. Fix: say it once in the hero, nowhere else.

2. **"Application" / "request" / "partnership request" terminology.** The partner is the buyer. They are not applying. They are briefing us. Fix: replace all instances with "brief" or "search."

3. **Time estimates contradict each other.** "Under 60 seconds" (exit popup) vs. "about 30 seconds" (step 0) vs. "~1 minute" (exit popup mid-flow) vs. "under two minutes" (nowhere yet). Fix: standardise on "under two minutes" everywhere.

4. **Gold color in emails violates brand.** Brand spec prohibits gold accents. The reminder email CTA button uses `#C9A24E`. Fix: switch to monochromatic eclipse/ivory.

5. **Placeholder text used as guidance.** The textarea placeholder is 28 words and disappears on first keystroke. Fix: move to helper text below the field.

---

## Summary of Changes

### Files to edit:
- `src/pages/PartnerFunnel.tsx` — hero copy, stepper labels, mobile badge
- `src/components/partner-funnel/FunnelSteps.tsx` — all step headings, labels, placeholders, buttons, availability banner, toast messages, step labels constant
- `src/components/partner-funnel/ExitIntentPopup.tsx` — all copy
- `src/components/partner-funnel/ResumeFunnelDialog.tsx` — body text, CTA label
- `src/components/partner-funnel/TrustBadges.tsx` — remove "No upfront fees" (said elsewhere)
- `src/components/partner-funnel/FunnelAIAssistant.tsx` — greeting, quick replies, subheader
- `src/pages/PartnershipSubmitted.tsx` — title, body, remove company label, remove ThemeToggle
- `supabase/functions/send-funnel-reminder/index.ts` — subjects, body copy, CTA labels, button color
- `supabase/functions/send-partner-request-received/index.ts` — "request" to "brief" terminology

### What does NOT change:
- No new components
- No layout or structural changes
- No logic changes
- Form field order stays the same
- All analytics, autosave, resume, exit intent logic untouched

### Target score: 92/100
(Remaining 8 points require real testimonials and live social proof data, which is content, not copy.)
