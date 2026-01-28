
# Comprehensive Plan: Candidate Platform 78/100 → 100/100

## Executive Summary

This plan addresses all gaps identified in the comprehensive audit of The Quantum Club's candidate-facing features. The current score of **78/100** can reach **100/100** through 8 focused phases covering 22 implementation tasks over approximately 40-50 development hours.

---

## Current State Assessment

### Score Breakdown by Feature Area

| Feature Area | Current | Target | Gap |
|-------------|---------|--------|-----|
| Candidate Dashboard | 95% | 100% | 5 pts |
| Job Search & Applications | 88% | 100% | 12 pts |
| Career Development Tools | 65% | 100% | 35 pts |
| Interview Management | 60% | 100% | 40 pts |
| Offer Management | 20% | 100% | 80 pts |
| Assessments & Skills | 75% | 100% | 25 pts |
| Club Projects | 70% | 100% | 30 pts |
| Mobile/PWA Experience | 70% | 100% | 30 pts |

### Critical Data Gaps

| Table | Current Count | Status |
|-------|---------------|--------|
| candidate_offers | 0 | Schema exists, no UI |
| interview_prep_briefs | 0 | Schema exists, no UI |
| candidate_scorecards | 0 | Schema exists, no UI |
| career_paths | 49 | Working, sample data present |
| interview_bookings | 0 | Empty, widget ready |

### "Coming Soon" Blockers

Found **211 instances** across 25 files where features are stubbed with "Coming Soon" messages, including:
- Apple Calendar integration
- PDF export for transcripts
- Privacy settings in UserSettings
- TQC Resume builder
- Bulk email/scheduling in job dashboard
- Video intro for proposals
- Portfolio attachments

---

## Phase 1: Offer Management System (Score Impact: +8 points)

### Task 1.1: Create Offer Comparison UI
**Files to create:**
- `src/pages/OfferComparison.tsx` - Main comparison dashboard
- `src/components/offers/OfferCard.tsx` - Individual offer display
- `src/components/offers/CompensationBreakdown.tsx` - Salary/equity/bonus visualization
- `src/components/offers/OfferComparisonTable.tsx` - Side-by-side comparison
- `src/hooks/useCandidateOffers.ts` - Data fetching hook

**Database changes:**
- Ensure `candidate_offers` table has RLS policies for candidate access
- Add computed columns or views for total compensation calculations

**Implementation:**
```text
┌─────────────────────────────────────────────────────────┐
│                  Offer Comparison Tool                   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Company A │  │ Company B │  │ Company C │              │
│  │ $120K base│  │ $110K base│  │ $130K base│              │
│  │ 15% bonus │  │ 20% bonus │  │ 10% bonus │              │
│  │ 0.1% eq   │  │ 0.2% eq   │  │ 0.05% eq  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │ After-Tax Comparison (NL)          $89K $85K $92K ││
│  │ 4-Year Equity Projection           $40K $80K $20K ││
│  │ QUIN Recommendation: Company A for stability       ││
│  └────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Navigation:**
- Add to candidate nav: `/offers` → Offer Comparison
- Link from dashboard NextBestActionCard when offers exist

### Task 1.2: QUIN Offer Negotiation Assistant
**Files to create:**
- `src/components/offers/OfferNegotiationChat.tsx` - AI chat for negotiation tips
- Edge function: `supabase/functions/generate-offer-recommendation/index.ts` (exists, enhance)

**Features:**
- Counter-offer suggestions based on market data
- Risk assessment for negotiation tactics
- Email draft generation for negotiations

---

## Phase 2: Interview Self-Booking (Score Impact: +7 points)

### Task 2.1: Candidate Interview Scheduler
**Files to modify:**
- `src/pages/InterviewPrep.tsx` - Add booking section
- Create: `src/components/interview/SelfBookingWidget.tsx`
- Create: `src/components/interview/InterviewSlotPicker.tsx`

**Logic:**
```text
1. Fetch available slots from company booking links
2. Show calendar with available times
3. Candidate selects slot
4. Create booking with is_interview_booking = true
5. Trigger activity feed event
6. Send confirmation to candidate + interviewers
```

**Database:**
- Ensure `bookings` table RLS allows candidate inserts for interview slots
- Create view linking `booking_links` to `applications` for smart slot filtering

### Task 2.2: Interview Prep Briefs UI
**Files to create:**
- `src/components/interview/PrepBriefCard.tsx` - Display interview_prep_briefs data
- Modify `src/pages/InterviewPrep.tsx` to fetch and display briefs

**Content:**
- Company culture summary
- Interviewer LinkedIn profiles (if available)
- Expected questions based on role
- QUIN-generated "3 questions to ask them"

---

## Phase 3: AI Cover Letter Generator (Score Impact: +5 points)

### Task 3.1: Standalone Cover Letter Tool
**Files to create:**
- `src/pages/CoverLetterGenerator.tsx` - Full-page tool
- `src/components/applications/CoverLetterBuilder.tsx` - Builder component
- Edge function: `supabase/functions/generate-cover-letter/index.ts`

**Features:**
- Input: Job URL or job_id + resume data
- Output: Tailored cover letter with QUIN branding
- Tone selector: Professional, Conversational, Executive
- Export to PDF, copy to clipboard
- Save to `candidate_documents` table

**Integration:**
- Add quick action button in JobDetail page
- Link from "Apply" flow

### Task 3.2: Application Enhancement Dialog
**Files to modify:**
- `src/components/job/JobApplicationDialog.tsx` (or similar)

**Add:**
- "Generate cover letter with QUIN" button
- Cover letter preview before submission
- Optional custom message field

---

## Phase 4: Career Development Suite (Score Impact: +6 points)

### Task 4.1: Mentor Matching System
**Files to create:**
- `src/pages/MentorMatching.tsx` - Mentor discovery page
- `src/components/career/MentorCard.tsx` - Mentor profile card
- `src/components/career/MentorRequestDialog.tsx` - Request connection
- `src/hooks/useMentorMatching.ts` - Matching algorithm hook

**Database:**
- Create `mentor_profiles` table if not exists
- Create `mentor_connections` table with status tracking
- RLS: Candidates can view available mentors, request connections

### Task 4.2: Enhance Career Path Page
**Files to modify:**
- `src/pages/CareerPath.tsx`

**Changes:**
- Remove sample data fallback (line 55-92), show "No paths for this role" gracefully
- Add skill gap analysis integration
- Add "Find a mentor for this path" CTA
- Add "Courses to bridge gap" from Academy

### Task 4.3: Skill Gap Analyzer
**Files to create:**
- `src/components/career/SkillGapAnalyzer.tsx`
- Edge function: `supabase/functions/analyze-skill-gaps/index.ts`

**Features:**
- Compare current skills (from profile) to target role requirements
- Show percentage match
- Suggest Academy courses to close gaps
- Track skill acquisition over time

---

## Phase 5: Club Projects Completion (Score Impact: +5 points)

### Task 5.1: Dynamic Stats in ProjectsPage
**Files to modify:**
- `src/pages/ProjectsPage.tsx` (lines 109-145)

**Changes:**
```typescript
// Replace hardcoded stats:
// "247" → actual project count
// "87%" → actual avg match score
// "<24h" → actual avg time to hire

const { data: projectStats } = useQuery({
  queryKey: ['project-stats'],
  queryFn: async () => {
    const { data, error } = await supabase.rpc('get_project_marketplace_stats');
    return data;
  }
});
```

**Database:**
- Create `get_project_marketplace_stats()` function returning real counts

### Task 5.2: Video Intro for Proposals
**Files to modify:**
- `src/components/projects/proposals/EnhancedProposalBuilder.tsx` (line 278-281)

**Implementation:**
- Add video recording widget (Loom-style or native)
- Upload to Supabase Storage
- Store URL in proposal record
- Replace "Coming Soon" badge with actual functionality

### Task 5.3: Portfolio Attachment
**Files to modify:**
- `src/components/projects/proposals/EnhancedProposalBuilder.tsx` (line 282-285)

**Implementation:**
- File upload for portfolio PDFs/links
- Link to existing documents from `candidate_documents`
- Display in proposal view

---

## Phase 6: Assessment Enhancements (Score Impact: +4 points)

### Task 6.1: AI Skill Gap Analysis Post-Assessment
**Files to modify:**
- Assessment result pages (SwipeGame, ValuesPoker, etc.)

**Add:**
- After completing assessment, show AI analysis
- "Based on your results, consider these skills..."
- Link to Academy courses
- Store results in profile for job matching

### Task 6.2: Assessment Results Dashboard
**Files to create:**
- `src/pages/MyAssessments.tsx` - All completed assessments
- `src/components/assessments/AssessmentResultCard.tsx`

**Features:**
- View all completed assessments
- Re-take option
- Share results on profile (optional)
- Trend analysis over time

---

## Phase 7: Mobile & PWA Enhancements (Score Impact: +4 points)

### Task 7.1: Push Notification Setup
**Files to modify:**
- `src/hooks/usePushNotifications.ts` (exists, needs completion)
- Create: `supabase/functions/send-push-notification/index.ts`

**Implementation:**
- Request notification permission on first login
- Send notifications for:
  - New job matches
  - Interview reminders (1h before)
  - Offer received
  - Message from strategist

### Task 7.2: Biometric Auth
**Files to modify:**
- `src/hooks/useBiometricAuth.ts` (exists, needs completion)

**Implementation:**
- Enable Face ID / Touch ID for native app
- Store auth token securely in Keychain
- Quick re-auth without password

### Task 7.3: Offline Mode
**Files to create:**
- `src/hooks/useOfflineSync.ts`
- IndexedDB caching for key data

**Features:**
- Cache profile, applications, saved jobs
- Queue actions when offline
- Sync on reconnect

---

## Phase 8: Polish & Testing (Score Impact: +6 points)

### Task 8.1: Remove All "Coming Soon" Stubs
**Files to modify:** 25 files with 211 instances

**Priority removals:**
1. Privacy Settings in UserSettings
2. TQC Resume Builder
3. Apple Calendar integration message (graceful disable)
4. Bulk email/scheduling (implement or remove from UI)
5. PDF export for transcripts

### Task 8.2: E2E Testing Suite
**Files to create:**
- `e2e/candidate-dashboard.spec.ts`
- `e2e/job-application-flow.spec.ts`
- `e2e/offer-comparison.spec.ts`
- `e2e/interview-booking.spec.ts`

**Coverage:**
- Full application flow from search to offer
- Interview booking and prep
- Offer comparison and acceptance
- Profile completion journey

### Task 8.3: Accessibility Audit
**Scope:**
- All new components need ARIA labels
- Keyboard navigation for all interactive elements
- Screen reader testing for critical flows
- Color contrast verification

### Task 8.4: Performance Optimization
**Actions:**
- Lazy load all new pages
- Batch database queries in hooks
- Add suspense boundaries
- Optimize images and assets

---

## Implementation Roadmap

| Phase | Duration | Dependencies | Score Impact |
|-------|----------|--------------|--------------|
| Phase 1: Offers | 8-10h | None | +8 |
| Phase 2: Interviews | 6-8h | Phase 1 | +7 |
| Phase 3: Cover Letters | 4-5h | None | +5 |
| Phase 4: Career Dev | 8-10h | None | +6 |
| Phase 5: Projects | 5-6h | None | +5 |
| Phase 6: Assessments | 4-5h | Phase 4 | +4 |
| Phase 7: Mobile/PWA | 6-8h | None | +4 |
| Phase 8: Polish | 6-8h | All | +6 |

**Total: 47-60 hours | Score: 78 → 100**

---

## Database Migrations Required

```sql
-- Phase 1: Offer Management
ALTER TABLE candidate_offers ADD COLUMN IF NOT EXISTS after_tax_estimate NUMERIC;
ALTER TABLE candidate_offers ADD COLUMN IF NOT EXISTS equity_4yr_value NUMERIC;
CREATE INDEX idx_candidate_offers_candidate_id ON candidate_offers(candidate_id);

-- Phase 2: Interview Booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id);

-- Phase 4: Mentor Matching
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  specializations TEXT[],
  years_experience INTEGER,
  max_mentees INTEGER DEFAULT 3,
  is_accepting_mentees BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mentor_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES mentor_profiles(id),
  mentee_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 5: Project Stats Function
CREATE OR REPLACE FUNCTION get_project_marketplace_stats()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'active_projects', (SELECT COUNT(*) FROM freelance_projects WHERE status = 'open'),
    'avg_match_score', (SELECT AVG(match_score) FROM freelance_project_matches WHERE match_score >= 70),
    'avg_hire_time_hours', 24 -- Calculate from actual data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Navigation Updates

Add to `src/config/navigation.config.ts` under candidate career section:

```typescript
{ name: "Offer Comparison", icon: DollarSign, path: "/offers" },
{ name: "My Assessments", icon: ClipboardCheck, path: "/my-assessments" },
{ name: "Find a Mentor", icon: Users, path: "/mentors" },
{ name: "Cover Letter Builder", icon: FileText, path: "/cover-letter-builder" },
```

---

## Success Metrics

After implementation, verify:

| Metric | Before | After |
|--------|--------|-------|
| Candidate offers with UI | 0% | 100% |
| Interview self-booking | 0% | 100% |
| Cover letter generation | Partial | Full |
| Career path mentor linking | 0% | 100% |
| Project stats dynamic | 0% | 100% |
| "Coming Soon" stubs | 211 | <20 |
| E2E test coverage | 0% | 80% |
| PWA features active | 70% | 100% |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Edge function costs for AI | Use Lovable AI models (no API key needed) |
| Complex mentor matching | Start with manual matching, add AI later |
| Push notification setup | Degrade gracefully if not supported |
| Large migration scope | Implement in phases, ship incrementally |

---

## Summary

This plan addresses all 22 points needed to reach 100/100 through 8 coordinated phases. Priority should be given to Phases 1-3 which deliver the highest-impact candidate-facing features (Offers, Interviews, Cover Letters), followed by career development and polish.

Each phase can be shipped independently, allowing for iterative improvement and user feedback between releases.
