
# Implementation Plan: Six High-Value Missing Features

## Overview
This plan covers the implementation of six distinct features identified in the audit, prioritized by user impact and development complexity.

---

## Feature 1: Share Recording & PDF Export

**Current State:** `RecordingPlaybackPage.tsx` line 349-352 shows "PDF export coming soon" toast.

**Implementation:**

### 1.1 Recording Share Link
- Create database table `recording_share_links` for secure, time-limited sharing
- Fields: `id`, `recording_id`, `share_token`, `expires_at`, `allowed_domains[]`, `view_count`, `created_by`
- Generate watermarked share URLs with 72-hour expiry (per TQC policy)
- Add Share button component with link generation and copy-to-clipboard

### 1.2 PDF Export
- Create edge function `generate-recording-pdf` using jsPDF
- Include: transcript, AI analysis summary, key moments, action items, speaking metrics
- Apply TQC branding (clover logo, color tokens)
- Generate signed download URL from storage

**Files to Create/Modify:**
| File | Change |
|------|--------|
| `supabase/migrations/xxx_recording_sharing.sql` | Add `recording_share_links` table |
| `supabase/functions/generate-recording-pdf/` | New edge function |
| `src/components/meetings/ShareRecordingDialog.tsx` | New share dialog component |
| `src/components/meetings/RecordingPlaybackPage.tsx` | Wire up Share + PDF buttons |
| `src/pages/SharedRecordingView.tsx` | Public shared recording viewer |

---

## Feature 2: Portfolio Attachment for Proposals

**Current State:** `EnhancedProposalBuilder.tsx` lines 282-286 show disabled "Attach Portfolio" button with "Coming Soon" badge.

**Implementation:**

### 2.1 Database Schema
- Create `proposal_attachments` table
- Fields: `id`, `proposal_id`, `file_name`, `file_url`, `file_type`, `file_size_bytes`, `sort_order`
- Link to storage bucket `proposal-attachments`

### 2.2 UI Components
- Create `ProposalAttachmentUploader` with drag-and-drop (react-dropzone)
- Support: PDF, DOC, images, ZIP (max 10MB per file, 5 files total)
- Display uploaded attachments as preview cards
- Allow reordering and deletion

**Files to Create/Modify:**
| File | Change |
|------|--------|
| `supabase/migrations/xxx_proposal_attachments.sql` | Add table + storage bucket policy |
| `src/components/proposals/ProposalAttachmentUploader.tsx` | New upload component |
| `src/components/projects/proposals/EnhancedProposalBuilder.tsx` | Replace disabled button with uploader |

---

## Feature 3: External Meeting Capture (Recall.ai Integration)

**Current State:** `JoinExternalMeetingDialog.tsx` creates session but shows "Coming Soon" alert (lines 173-179). The `external_meeting_sessions` table exists.

**Implementation:**

### 3.1 Bot Dispatch via Recall.ai
- Create edge function `dispatch-meeting-bot` calling Recall.ai API
- Store `bot_session_id` in `external_meeting_sessions`
- Status flow: `pending` → `bot_joining` → `in_meeting` → `recording` → `processing` → `complete`

### 3.2 Webhook Handler
- Create `recall-webhook-receiver` edge function
- Listen for: bot_joined, recording_started, recording_completed, transcript_ready
- On completion: download recording, store in Supabase storage, create `meeting_recordings_extended` record
- Chain to existing `transcribe-recording` → `analyze-meeting-recording-advanced` pipeline

### 3.3 UI Updates
- Remove "Coming Soon" alert from dialog
- Add real-time status tracking via Supabase Realtime
- Show bot join status, recording progress, and completion notification

**Files to Create/Modify:**
| File | Change |
|------|--------|
| `supabase/functions/dispatch-meeting-bot/` | New: Recall.ai bot dispatch |
| `supabase/functions/recall-webhook-receiver/` | New: Handle Recall.ai callbacks |
| `src/components/meetings/JoinExternalMeetingDialog.tsx` | Remove placeholder, add live status |
| `src/components/meetings/ExternalMeetingStatusCard.tsx` | New: real-time status tracker |

**Secret Required:** `RECALL_API_KEY` (will prompt user)

---

## Feature 4: External User Assignment to Job Teams

**Current State:** `job_team_assignments` table has `external_user_id` column and `AddJobTeamMemberDialog.tsx` supports TQC team assignment, but no UI for adding non-platform users (external interviewers).

**Implementation:**

### 4.1 Database Schema
- Create `external_interviewers` table (for non-TQC users invited to interview panels)
- Fields: `id`, `company_id`, `email`, `full_name`, `job_title`, `phone`, `invited_at`, `last_active_at`

### 4.2 Invite Flow
- Add "Invite External Interviewer" option in `AddJobTeamMemberDialog`
- Send email invitation with magic link
- External user lands on limited-access interview page
- Track usage for compliance (GDPR consent, access logs)

### 4.3 Interview Access
- Create `ExternalInterviewerView` page with job context, candidate dossier, scorecard submission
- Time-boxed access (configurable, default 7 days)
- Watermarked dossier views

**Files to Create/Modify:**
| File | Change |
|------|--------|
| `supabase/migrations/xxx_external_interviewers.sql` | Add table + RLS |
| `supabase/functions/invite-external-interviewer/` | New: send invite email with magic link |
| `src/components/partner/AddJobTeamMemberDialog.tsx` | Add external invite tab |
| `src/pages/ExternalInterviewerView.tsx` | New: limited-access interview page |
| `src/components/partner/ExternalInterviewerCard.tsx` | New: display external team members |

---

## Feature 5: Detailed Security Metrics

**Current State:** `SecurityDashboard.tsx` line 63-65 shows "Detailed security metrics and logs coming soon" placeholder.

**Implementation:**

### 5.1 Extended Metrics
Expand `useSecurityMetrics` hook with:
- Login attempt timeline (success/failure by hour)
- RLS policy hit/miss ratios per table
- API endpoint usage heatmap
- Geographic distribution of auth attempts
- Session duration analytics
- Suspicious pattern detection (multiple failed IPs, unusual hours)

### 5.2 Database Functions
- Create `get_detailed_auth_metrics(hours_back)` RPC
- Create `get_api_usage_by_endpoint()` RPC
- Create `get_geographic_auth_distribution()` RPC

### 5.3 UI Components
- `AuthTimelineChart` - 24h login attempt visualization
- `RLSHitRatioCard` - Policy effectiveness metrics
- `GeoSecurityMap` - World map with auth attempt origins
- `SuspiciousActivityTable` - Flagged patterns requiring attention

**Files to Create/Modify:**
| File | Change |
|------|--------|
| `supabase/migrations/xxx_security_metrics_functions.sql` | Add RPC functions |
| `src/hooks/useSecurityMetrics.ts` | Extend with detailed metrics |
| `src/components/admin/security/AuthTimelineChart.tsx` | New component |
| `src/components/admin/security/GeoSecurityMap.tsx` | New component |
| `src/components/admin/security/RLSHitRatioCard.tsx` | New component |
| `src/components/admin/security/SuspiciousActivityTable.tsx` | New component |
| `src/components/admin/security/SecurityDashboard.tsx` | Replace placeholder with new components |

---

## Feature 6: Company Activity Timeline

**Current State:** `CompanyLatestActivity.tsx` lines 186-190 show "Activity timeline coming soon" in the Activity tab.

**Implementation:**

### 6.1 Database Schema
- Create `company_activity_events` table
- Fields: `id`, `company_id`, `event_type`, `actor_id`, `target_type`, `target_id`, `metadata`, `created_at`
- Event types: `job_created`, `job_published`, `candidate_shortlisted`, `interview_scheduled`, `offer_extended`, `hire_completed`, `team_member_added`, `settings_updated`

### 6.2 Activity Logging
- Create database triggers on key tables (jobs, applications, job_team_assignments)
- Log events automatically with actor context
- Support manual event logging via RPC for complex workflows

### 6.3 UI Components
- `CompanyActivityTimeline` component with infinite scroll
- Event type icons and color coding
- Filter by event type, date range, actor
- Real-time updates via Supabase Realtime

**Files to Create/Modify:**
| File | Change |
|------|--------|
| `supabase/migrations/xxx_company_activity_events.sql` | Table + triggers |
| `src/components/companies/CompanyActivityTimeline.tsx` | New timeline component |
| `src/components/companies/CompanyLatestActivity.tsx` | Replace placeholder with timeline |
| `src/hooks/useCompanyActivity.ts` | New hook for fetching/subscribing |

---

## Implementation Order (Recommended)

| Priority | Feature | Complexity | User Impact |
|----------|---------|------------|-------------|
| 1 | Share Recording & PDF Export | Medium | High - Core workflow |
| 2 | Company Activity Timeline | Medium | High - Partner visibility |
| 3 | Detailed Security Metrics | Medium | High - Admin compliance |
| 4 | Portfolio Attachment | Low | Medium - Freelancer UX |
| 5 | External User Assignment | High | Medium - Enterprise feature |
| 6 | External Meeting Capture | High | Medium - Requires 3rd party |

---

## Technical Notes

### Storage Buckets Needed
- `proposal-attachments` (private, 10MB limit)
- `recording-exports` (private, signed URLs only)
- `external-recordings` (private, for Recall.ai downloads)

### Secrets Required
- `RECALL_API_KEY` - For external meeting capture (Feature 3)

### RLS Policies
All new tables will include strict RLS:
- Company scoped for partner features
- User scoped for candidate features
- Admin role checks for security features

### Compliance Considerations
- Dossier/recording shares: 72-hour expiry, domain allowlist, viewer watermarks
- External interviewer access: Time-boxed, audit logged
- Security metrics: Admin-only access, no PII in visualizations

---

## Summary

Six features spanning recording/sharing, proposals, meeting capture, team management, security, and activity tracking. Estimated effort: 8-12 development days total. All features follow existing patterns in the codebase and respect TQC's privacy-first, audit-logged architecture.
