# Missing Features Report
Generated: 2025-01-XX

This document lists all features, functions, and UI elements that are still missing or incomplete in the codebase.

## 🔴 Critical - Missing Edge Functions

### 1. **schedule-email-report**
**File:** `src/utils/analyticsExport.ts:144`  
**Status:** TODO comment, not implemented  
**Issue:** Email scheduling for analytics reports is a placeholder  
**Impact:** Users can't schedule automated analytics reports  
**Fix Required:** Create `supabase/functions/schedule-email-report/index.ts`  
**Estimated Effort:** 3-4 hours

```typescript
// Current state:
// TODO: Implement email scheduling via Edge Function
console.log(`Scheduling ${frequency} ${reportType} report to ${email}`);
```

### 2. **generate-ai-summary** ✅
**File:** `src/components/feed/RepostButton.tsx:203`  
**Status:** ✅ EXISTS - Function is implemented  
**Location:** `supabase/functions/generate-ai-summary/index.ts`  
**Note:** Function exists and is working

## 🟡 High Priority - Missing UI Features

### 3. **Contract Document Management**
**File:** `src/pages/ContractDetailPage.tsx:414`  
**Status:** Shows "Document management coming soon..."  
**Issue:** No UI for uploading/managing contract documents  
**Impact:** Users can't attach documents to contracts  
**Fix Required:** Create document upload/management UI  
**Estimated Effort:** 4-6 hours

### 4. **Booking Management Settings**
**Status:** Not implemented  
**Location:** Should be at `/scheduling/settings`  
**Features Needed:**
- Availability editor
- Booking link creation/management
- Booking analytics dashboard
- Tables: `booking_links`, `booking_availability_settings`, `booking_analytics`
**Estimated Effort:** 6 hours

### 5. **Company Settings Page**
**Status:** Not implemented  
**Location:** Should be at `/companies/:slug/settings`  
**Features Needed:**
- Company branding customization
- Partner-only settings
- Tables: `company_settings`, `company_branding`
**Estimated Effort:** 4 hours

### 6. **Expert Marketplace Full Implementation**
**Status:** Partially implemented  
**File:** `src/pages/ExpertMarketplace.tsx`  
**Features Needed:**
- Browse experts (may exist)
- Book sessions
- Tables: `expert_profiles`, `expert_sessions`
**Estimated Effort:** 8 hours

## 🟠 Medium Priority - Message Features (Database Exists, UI Missing)

### 7. **Message Attachments UI**
**Status:** Database table exists (`message_attachments`), no UI  
**Impact:** Users can't attach files to messages  
**Estimated Effort:** 4 hours

### 8. **Message Edit History UI**
**Status:** Database table exists (`message_edits`), no UI  
**Impact:** Users can't see edit history  
**Estimated Effort:** 2 hours

### 9. **@Mention Functionality**
**Status:** Database table exists (`message_mentions`), no UI  
**Impact:** Users can't mention others in messages  
**Estimated Effort:** 4 hours

### 10. **Emoji Reactions**
**Status:** Database table exists (`message_reactions`), no UI  
**Impact:** Users can't react to messages  
**Estimated Effort:** 3 hours

### 11. **Read Receipts**
**Status:** Database table exists (`message_read_receipts`), no UI  
**Impact:** Users can't see if messages were read  
**Estimated Effort:** 3 hours

### 12. **Message Templates Library**
**Status:** Database table exists (`message_templates`), no UI  
**Impact:** Users can't save/reuse message templates  
**Estimated Effort:** 4 hours

### 13. **Message Translation Feature**
**Status:** Database table exists (`message_translations`), no UI  
**Impact:** Users can't translate messages  
**Estimated Effort:** 4 hours

**Total Message Features Effort:** 20-24 hours

## 🔵 Low Priority - "Coming Soon" Features

### 14. **Apple Calendar Integration**
**Files:** 
- `src/pages/UserSettings.tsx:878`
- `src/components/settings/ConnectionsSettings.tsx:546`
**Status:** Shows "Apple Calendar integration coming soon"  
**Estimated Effort:** 6-8 hours

### 15. **Time Tracking Analytics Dashboard**
**File:** `src/pages/TimeTrackingPage.tsx:264`  
**Status:** Shows "Analytics Dashboard Coming Soon"  
**Estimated Effort:** 4 hours

### 16. **Edit/Dispute Time Entry Modals**
**File:** `src/pages/TimeTrackingPage.tsx:232-235`  
**Status:** Shows toast "coming soon"  
**Estimated Effort:** 3 hours

### 17. **Meeting Notes PDF Export**
**File:** `src/pages/MeetingNotes.tsx:97`  
**Status:** Shows toast "PDF export coming soon"  
**Estimated Effort:** 2 hours

### 18. **Meeting Notes Team Sharing**
**File:** `src/pages/MeetingNotes.tsx:101`  
**Status:** Shows toast "Team sharing coming soon"  
**Estimated Effort:** 3 hours

### 19. **Task Creation from Meeting Insights**
**File:** `src/pages/MeetingInsights.tsx:115`  
**Status:** Shows toast "Task creation coming soon"  
**Estimated Effort:** 2 hours

### 20. **ML Dashboard Performance Charts**
**File:** `src/pages/MLDashboard.tsx:317`  
**Status:** Shows "Performance charts coming soon..."  
**Estimated Effort:** 4 hours

### 21. **Course Preview**
**File:** `src/pages/CourseDetail.tsx:284`  
**Status:** Shows "Course preview coming soon"  
**Estimated Effort:** 3 hours

### 22. **Module Media Content**
**File:** `src/pages/ModuleDetail.tsx:346`  
**Status:** Shows "Media content coming soon"  
**Estimated Effort:** 3 hours

### 23. **Company Intelligence AI Insights**
**File:** `src/pages/CompanyIntelligence.tsx:298`  
**Status:** Shows "AI-extracted insights coming soon"  
**Estimated Effort:** 6 hours

### 24. **Meeting Intelligence Deeper Insights**
**File:** `src/pages/MeetingIntelligence.tsx:518`  
**Status:** Shows "Coming soon: Deeper insights across all your meetings"  
**Estimated Effort:** 8 hours

### 25. **TQC Resume Creator**
**Files:**
- `src/pages/UserSettings.tsx:2668`
- `src/components/settings/ConnectionsSettings.tsx:983`
**Status:** Shows "Coming Soon - Create TQC Resume"  
**Estimated Effort:** 12 hours

### 26. **AI-Powered Content Suggestions**
**File:** `src/components/social/CreatePostDialog.tsx:63`  
**Status:** Shows toast "AI-powered content suggestions coming soon"  
**Estimated Effort:** 6 hours

### 27. **Email Connections UI**
**File:** `src/components/settings/EmailConnections.tsx:167`  
**Status:** Shows "Coming Soon"  
**Estimated Effort:** 4 hours

### 28. **Calendar Provider Support**
**File:** `src/components/settings/CalendarIntegrationSettings.tsx:102`  
**Status:** Shows toast "This calendar provider is coming soon!"  
**Estimated Effort:** 4 hours

### 29. **QR Code Generation for Profiles**
**File:** `src/components/profile/ProfilePreview.tsx:194`  
**Status:** Shows "QR Code generation coming soon"  
**Estimated Effort:** 2 hours

### 30. **Feedback Management for Partners**
**File:** `src/components/partner/dashboards/HiringManagerDashboard.tsx:68`  
**Status:** Shows "Feedback management coming soon"  
**Estimated Effort:** 4 hours

### 31. **Bulk Email Feature**
**File:** `src/components/partner/QuickActionsBar.tsx:18`  
**Status:** Shows toast "Bulk email feature coming soon"  
**Estimated Effort:** 4 hours

### 32. **Partner Job Features**
**File:** `src/components/partner/PartnerJobsHome.tsx:504-510`  
**Status:** Multiple "coming soon" toasts:
- Invite candidates feature
- Export pipeline feature
- Club support request feature
**Estimated Effort:** 6 hours total

### 33. **Activity Timeline for Candidates**
**File:** `src/components/partner/CandidateDetailDialog.tsx:403`  
**Status:** Shows "Activity timeline coming soon"  
**Estimated Effort:** 4 hours

### 34. **External User Assignment**
**File:** `src/components/partner/AddJobTeamMemberDialog.tsx:425`  
**Status:** Shows "External user assignment coming soon..."  
**Estimated Effort:** 3 hours

### 35. **Assessment Results Integration**
**File:** `src/components/crm/ContactProfileView.tsx:356`  
**Status:** Shows "Assessment results integration coming soon"  
**Estimated Effort:** 4 hours

### 36. **Company Activity Timeline**
**File:** `src/components/companies/CompanyLatestActivity.tsx:189`  
**Status:** Shows "Activity timeline coming soon"  
**Estimated Effort:** 4 hours

### 37. **Share Application Feature**
**File:** `src/pages/Applications.tsx:233`  
**Status:** Shows toast "Share application feature coming soon"  
**Estimated Effort:** 2 hours

### 38. **Export Application History**
**File:** `src/pages/Applications.tsx:244`  
**Status:** Shows toast "Export application history feature coming soon"  
**Estimated Effort:** 3 hours

### 39. **Academy Creator Analytics**
**File:** `src/pages/AcademyCreatorHub.tsx:308`  
**Status:** Shows "Analytics Coming Soon"  
**Estimated Effort:** 4 hours

### 40. **Security Dashboard Detailed Metrics**
**File:** `src/components/admin/security/SecurityDashboard.tsx:64`  
**Status:** Shows "Detailed security metrics and logs coming soon"  
**Estimated Effort:** 6 hours

### 41. **Assessment Overview Charts**
**File:** `src/components/admin/assessments/AssessmentOverviewTab.tsx:106`  
**Status:** Shows "Detailed charts and trends coming soon"  
**Estimated Effort:** 4 hours

### 42. **Company Status Management**
**File:** `src/pages/admin/CompanyManagement.tsx:88`  
**Status:** Shows toast "Company status management coming soon"  
**Estimated Effort:** 2 hours

### 43. **Global Analytics Time to Hire**
**File:** `src/pages/admin/GlobalAnalytics.tsx:76`  
**Status:** Placeholder comment "Calculate avg time to hire (placeholder - needs actual hired data)"  
**Estimated Effort:** 2 hours

### 44. **Deals Pipeline Insights**
**File:** `src/pages/admin/DealsPipeline.tsx:68`  
**Status:** Comment "Placeholder for future insights"  
**Estimated Effort:** 4 hours

## 📊 Database Tables Without UI

### Candidate Management
- `candidate_documents` - Document upload UI exists but may need enhancement
- `candidate_notes` - No notes interface for strategists
- `candidate_scorecards` - No scorecard UI
- `candidate_comments` - No commenting system
- `candidate_interactions` - No interaction log UI
- `candidate_invitations` - No invitation management UI
- `candidate_application_logs` - No audit trail UI

### Booking & Calendar
- `booking_links` - No link management UI
- `booking_availability_settings` - No availability editor
- `booking_calendar_syncs` - No sync status UI
- `booking_workflows` - No workflow builder
- `booking_waitlist` - No waitlist management
- `booking_reminders` - No reminder config UI
- `booking_analytics` - No booking analytics dashboard

### Email & Inbox
- `email_connections` - No email account connection UI
- `email_labels` - No label management
- `email_drafts` - No draft saving
- `email_follow_ups` - No follow-up reminders
- `email_meetings` - No calendar event extraction
- `email_relationships` - No contact relationship graph
- `email_verifications` - No verification status UI

### Meetings & Video Calls
- `meeting_bots` - No bot management UI
- `meeting_bot_sessions` - No bot session logs
- `meeting_templates` - No meeting template builder (partially implemented)
- `meeting_polls` - No in-meeting polls
- `meeting_join_requests` - No join request approval UI

### AI & Content
- `ai_memory` - No memory management UI
- `ai_persona_profiles` - No persona customization
- `ai_content_suggestions` - No suggestion review UI
- `ai_generated_content` - No generated content library
- `ai_copilot_tips` - No tip management

### Social Media & Content
- `collaborative_posts` - No multi-author post creation
- `company_stories` - No Instagram-style stories
- `content_calendar` - No content scheduling calendar
- `content_recommendations` - No AI content ideas

### Learning & Academy
- `learner_preferences` - No preference settings
- `learning_analytics` - No student analytics dashboard
- `learning_badges` - No badge system for courses
- `learning_paths` - No learning path builder
- `live_sessions` - No live class scheduling

## 📈 Summary Statistics

**Total Missing Features:** 44+  
**Critical (Edge Functions):** 2  
**High Priority (UI Features):** 5  
**Medium Priority (Message Features):** 7  
**Low Priority (Coming Soon):** 30+  
**Database Tables Without UI:** 40+

**Total Estimated Effort:** ~150-200 hours

## 🎯 Recommended Priority Order

### Week 1 (Critical):
1. Create `schedule-email-report` edge function
2. Verify/create `generate-ai-summary` edge function
3. Implement contract document management

### Week 2 (High Priority):
4. Booking management settings page
5. Company settings page
6. Expert marketplace completion

### Week 3-4 (Medium Priority):
7. Implement message features incrementally (attachments, mentions, reactions)
8. Message templates and translation

### Week 5+ (Low Priority):
9. Implement "coming soon" features based on user demand
10. Add UI for database tables with highest usage

## 📝 Notes

- Many features are 80-90% complete, just need final implementation
- Database tables exist for most features, just need UI/functionality
- Edge functions are well-structured, just need to be created for missing ones
- Technical debt tracker (`src/utils/codeCleanup.ts`) has detailed list of TODOs
- Many "coming soon" features may be intentionally deferred for future releases

