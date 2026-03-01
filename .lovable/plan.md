
# Candidate Experience Audit -- The Quantum Club

## Overall Score: 52/100

Assessed across 10 dimensions critical for an invite-only executive talent platform targeting the 0.1%.

---

## Scoring Breakdown

### 1. Onboarding Flow (7/10)

**What works:**
- 4-step progressive onboarding (Contact, Professional, Career, Preferences)
- Phone verification with OTP
- Resume upload with validation
- Partial progress saving (resumes on return)
- Pre-fill from existing profile data

**Issues:**
- Onboarding redirects to `/home` on completion (line 467 of OAuthOnboarding.tsx) instead of `/club-home`, which is the actual candidate dashboard -- users land on a different Home page that also checks for admin redirect
- Profile completeness is calculated from only 4 fields (full_name, current_title, bio, avatar_url) -- misses resume, phone, location, salary, LinkedIn (line 52-53, CandidateHome.tsx)
- No calendar connection step during onboarding (spec requires it)
- No SSO/LinkedIn auto-fill of professional data during onboarding
- `dream_job_title` is collected but never used anywhere downstream

### 2. Dashboard / Club Home (4/10)

**What works:**
- Role-based home views (CandidateHome, PartnerHome, AdminHome)
- QUIN Next Best Action card
- Stats bar with applications, matches, interviews, messages
- Collapsible sections (Career Activity, Market Intelligence, Tools)

**Issues:**
- All sections (Career Activity, Market Intelligence, Tools & Resources) start **collapsed** -- candidates see only a stats bar, QUIN card, and AI chat on first load. The most important content (applications, job recommendations, upcoming interviews) is hidden
- InterviewCountdownWidget and StrategistContactCard are outside the collapsible but show above hidden content, creating a confusing hierarchy
- ProfileCompletion widget is buried inside collapsed Career Activity section
- No pipeline visualization on the home page (must navigate to /applications)
- SalaryInsightsWidget, SkillDemandWidget, CareerProgressWidget all in collapsed Market Intelligence -- candidates never discover these
- DocumentStatusWidget is in the collapsed Tools section -- urgent document requests are invisible

### 3. Job Discovery & Application (6/10)

**What works:**
- Match score calculation with AI (calculate-enhanced-match edge function)
- Club Sync auto-apply for 85%+ matches with consent dialog
- Job saving/bookmarking persisted to database
- Currency conversion to user's preferred currency
- Cover letter generator with AI
- Filters: location, salary, employment type, remote, company, department
- Referral system integrated into job cards

**Issues:**
- `handleApply` in Jobs.tsx (line 276) just shows a toast "Application submitted" but does NOT actually create a database record -- it's a fake success message. Real application creation only happens in JobDetail.tsx `handleApply`
- Match scores are calculated lazily (only first 5 jobs without scores, 1 second delay) -- most jobs show no match score
- No "Interview Prep" tab in candidate job navigation (it exists in code but only renders for admin/partner view at line 771)
- Competition insight shows fabricated data: `candidatesAhead: Math.floor(count * 0.3)` -- arbitrary 30/70 split (line 319, Applications.tsx)
- `averageResponseTime: "2.5 days"` is hardcoded (line 322)

### 4. Application Pipeline Tracking (5/10)

**What works:**
- Visual pipeline stages per application
- Active/Rejected/Archived tabs
- Strategist contact card per application
- Timeline and deadlines widget
- Mobile-specific pipeline view
- CSV export per application
- Achievement triggers on viewing applications

**Issues:**
- `other_candidates_count` is used for competition insights but the data source is unclear -- likely always 0 or missing
- Stage preparation data (`currentStage.preparation?.resources`) is referenced but pipeline_stages rarely include this metadata
- Applications page queries `candidate_id` in InterviewPrep.tsx (line 68) but `user_id` in JobDetail.tsx (line 226) -- inconsistent FK naming likely causes InterviewPrep to return empty results
- "Share link" copies a `/applications/:id/share` URL that has no corresponding route
- No real-time updates when application stage changes (no Supabase realtime subscription)

### 5. Profile & Settings (6/10)

**What works:**
- Comprehensive settings page: profile, compensation, privacy, security, connections, calendar, notifications, preferences, freelance, time tracking, API, communication
- Privacy controls: field-level toggles, stealth mode with 3 levels, cold outreach toggle, blocked companies
- GDPR data export request
- Social connections (LinkedIn, GitHub, Twitter, Instagram)
- Music section (Spotify, Apple Music)
- Resume upload/management
- Profile slug editing for vanity URLs
- Header media (image/video wallpaper)
- Avatar upload with dialog

**Issues:**
- Profile completeness on EnhancedProfile.tsx is hardcoded to 75% (line 378) -- never dynamically calculated
- `bio` field maps to `career_preferences` column -- confusing data model, not labeled as "bio" in the database
- Settings page uses debounced auto-save (1s delay) for some fields but explicit save button for others -- inconsistent UX
- No indication of which fields are visible to recruiters vs. hidden
- Freelance hourly rate defaults to 50-100 in onboarding but 100-200 in settings -- conflicting defaults
- Calendar integration settings exist but no actual calendar booking flow for candidates

### 6. Interview Preparation (3/10)

**What works:**
- STAR method builder with save
- Practice questions (Behavioral, Technical, Culture Fit)
- Tips and tricks section
- Self-booking widget for interview scheduling
- Prep brief card component exists

**Issues:**
- Practice questions are entirely hardcoded generic strings -- not tailored to the job, company, or JD
- STAR answer "save" just shows a toast (line 94) -- does NOT persist to database
- InterviewPrep queries `candidate_id` (line 68) while applications are stored with `user_id` -- likely returns 0 results for all candidates
- No AI-powered interview simulation (spec requires JD-aware Q&A)
- No panel briefing (who are the interviewers, their LinkedIn profiles, preferences)
- No "7 smart questions to ask" generation (spec requirement)
- Interview prep is not linked from the application pipeline cards

### 7. Offer Management (5/10)

**What works:**
- Offer comparison page with card and table views
- Compensation breakdown component
- Offer negotiation chat
- Accept/decline/negotiate actions
- Status filtering (pending, accepted, declined)

**Issues:**
- No after-tax comparison (spec requires cash/bonus/equity after-tax simulator)
- No decision timer visible to candidate
- Currency hardcoded to EUR (line 34, OfferComparison.tsx) -- ignores user's preferred currency
- No offer history or timeline of changes

### 8. Referral System (7/10)

**What works:**
- Tier progress tracking
- Challenges/gamification
- Earnings overview with projected vs realized
- Pipeline tracker per referral
- Leaderboard
- Activity feed
- Share link generator
- Analytics dashboard
- Revenue share visibility
- Invite system integration

**Issues:**
- "Refer a Member" and "Claim Company" buttons both open the same ClaimReferralDialog -- wrong dialog for member referral
- No clear distinction between "projected" and "realized" rewards in the UI (spec requires explicit separation)

### 9. Privacy & Security (7/10)

**What works:**
- Stealth mode with 3 levels
- Blocked companies list
- Field-level privacy toggles (10 individual fields)
- Cold outreach toggle
- GDPR data export
- Phone verification with OTP
- Progressive lockout on failed logins
- MFA enforcement for elevated roles
- Password history checking
- Session timeout with warning
- HIBP breach checking

**Issues:**
- Blocked companies are stored as string array -- no validation against actual company IDs, so typos result in ineffective blocking
- No visual indicator of "who can see what" -- candidates toggle settings without seeing the impact
- Data deletion (DSAR delete) flow doesn't exist -- only export is implemented
- No consent receipts UI (spec requires timestamp + scope visibility)
- Employer shield (current employer protection) is not explicitly surfaced during onboarding

### 10. Candidate-Facing Communication (2/10)

**What works:**
- Inbox page exists
- Messages page exists
- Strategist contact card with "last contact" time

**Issues:**
- No unified inbox threading (system, strategist, partner threads as spec requires)
- No "reply in <=24h" SLA indicator from strategist
- No notification when application stage changes
- Push notification opt-in exists but is buried in collapsed Tools section
- No real-time message indicators in navigation
- No WhatsApp integration for candidates (only admin-side)
- `lastContact: "2 hours ago"` is hardcoded in Applications.tsx (line 290) -- not from real data

---

## Priority Roadmap to 100/100

### Phase 1: Critical Fixes (52 -> 68)

| Task | Impact | Effort |
|---|---|---|
| Fix onboarding redirect to `/club-home` | High | Tiny |
| Fix fake `handleApply` in Jobs.tsx to actually create application | Critical | Small |
| Fix InterviewPrep `candidate_id` vs `user_id` query | High | Tiny |
| Expand dashboard sections by default (Career Activity always open) | High | Tiny |
| Calculate profile completeness dynamically (all relevant fields) | High | Small |
| Fix hardcoded 75% profile completeness on EnhancedProfile | Medium | Tiny |
| Fix OfferComparison to use user's preferred currency | Medium | Small |
| Remove hardcoded `lastContact`, `averageResponseTime`, competition split | Medium | Small |
| Fix `/applications/:id/share` missing route | Low | Small |

### Phase 2: Core Experience Gaps (68 -> 82)

| Task | Impact | Effort |
|---|---|---|
| AI-powered interview prep (JD-aware questions, panel briefing, 7 smart questions) | High | Medium |
| Persist STAR answers to database | Medium | Small |
| Real-time application stage updates (Supabase realtime) | High | Medium |
| Link interview prep from application pipeline cards | Medium | Small |
| Candidate notification system (stage changes, messages, document requests) | High | Medium |
| Surface DocumentStatusWidget above the fold | Medium | Tiny |
| Add calendar connection step to onboarding | Medium | Medium |
| Compute match scores eagerly (not lazy 5-at-a-time) | Medium | Medium |

### Phase 3: Premium Polish (82 -> 92)

| Task | Impact | Effort |
|---|---|---|
| After-tax offer simulator (cash/bonus/equity) | High | Large |
| Unified inbox with threaded conversations (system, strategist, partner) | High | Large |
| Employer shield onboarding step (block current employer) | Medium | Small |
| Consent receipts UI (what was shared, when, with whom) | Medium | Medium |
| DSAR deletion flow (not just export) | Medium | Medium |
| "Who sees what" privacy preview | Medium | Medium |
| Validate blocked companies against actual company records | Low | Small |
| Decision timer on offers | Medium | Small |

### Phase 4: 0.1% Differentiators (92 -> 100)

| Task | Impact | Effort |
|---|---|---|
| Voice-based interview coaching (ElevenLabs integration) | High | Large |
| AI-generated panel briefing with interviewer LinkedIn data | High | Large |
| Real competition insights from actual pipeline data | Medium | Medium |
| Strategist SLA timer (reply within 24h, shortlist ETA 24-48h) | Medium | Medium |
| Proactive QUIN nudges ("Your notice period ends in 2 weeks") | Medium | Medium |
| Calendar bi-directional sync with buffer enforcement | Medium | Large |
| WhatsApp candidate communication channel | Medium | Large |
| Progressive profiling prompts (never block, always nudge) | Low | Medium |

---

## Summary

The candidate system has **strong foundations** -- onboarding, settings, privacy, and referrals are solid. The critical gaps are in **daily use flows**: the dashboard hides important content, job applications have a fake success path, interview prep returns no data due to a query bug, and communication is essentially non-functional. Fixing Phase 1 items alone would raise the score to ~68 and make the product viable for a limited release. Phase 2 gets you to the concierge-level experience the 0.1% expects.
