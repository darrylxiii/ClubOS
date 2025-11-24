# Upcoming Meetings Tab - Comprehensive Audit & Requirements

## Current Implementation Analysis

### What's Currently Working

1. **Data Sources**
   - ✅ Fetches from `bookings` table (confirmed interview bookings)
   - ✅ Fetches from `detected_interviews` table (calendar-detected interviews)
   - ✅ Real-time subscriptions for both tables
   - ✅ Merges and deduplicates data

2. **Display Features**
   - ✅ Categorizes by time: Today / This Week / Upcoming
   - ✅ Shows candidate info (name, avatar, profile link)
   - ✅ Shows interviewers (with avatars and names)
   - ✅ Shows meeting links (Join button)
   - ✅ Shows interview type and pipeline stage
   - ✅ Shows "Starting soon" badge (15 min warning)
   - ✅ Shows feedback pending alert
   - ✅ Shows "From Calendar" badge for detected interviews

3. **Actions Available**
   - ✅ Manual Entry dialog (add interview manually)
   - ✅ Calendar Linker (link calendar events to interviews)
   - ✅ View candidate profile
   - ⚠️ Prep Doc button (disabled)
   - ⚠️ Reschedule button (disabled)

4. **Location**
   - Currently only in Job Dashboard (`/jobs/:jobId/dashboard`)
   - Shows interviews for a specific job only

---

## Critical Questions for Requirements

### 1. Stakeholder Visibility & Access

**Q1.1: Who should see the Upcoming Meetings tab?**
- [ ] Partners (hiring managers, interviewers) - for their company's jobs
- [ ] TQC team (admins, strategists) - for all jobs
- [ ] Candidates - for their own interviews
- [ ] All of the above with different views

**Q1.2: Should candidates see this tab?**
- [ ] Yes, in their candidate dashboard/home
- [ ] Yes, but only when viewing a specific job they applied to
- [ ] No, candidates should use a different interface
- [ ] Yes, but with limited information (no interviewer details?)

**Q1.3: What should partners see?**
- [ ] Only interviews for the current job being viewed
- [ ] All interviews across all their company's jobs
- [ ] Option to toggle between "This Job" and "All Jobs"
- [ ] Filter by job, date range, interview type

**Q1.4: What should TQC team see?**
- [ ] All interviews across all jobs in the platform
- [ ] Only interviews where TQC members are interviewers
- [ ] Filterable by job, company, date range
- [ ] Separate view in admin dashboard

---

### 2. Data Display & Filtering

**Q2.1: What filters should be available?**
- [ ] By job (if viewing all jobs)
- [ ] By date range (this week, this month, custom)
- [ ] By interview type (TQC intro, partner interview, panel, etc.)
- [ ] By candidate
- [ ] By interviewer (show only interviews I'm part of)
- [ ] By status (upcoming, completed, cancelled)
- [ ] By feedback status (pending, submitted)

**Q2.2: What sorting options?**
- [ ] Date/time (ascending/descending)
- [ ] Candidate name
- [ ] Job title
- [ ] Interview type

**Q2.3: Should there be a calendar view?**
- [ ] Yes, monthly calendar view
- [ ] Yes, weekly calendar view
- [ ] Yes, daily agenda view
- [ ] No, list view is sufficient

**Q2.4: What information should be shown for each interview?**
- [ ] Candidate name & avatar
- [ ] Job title
- [ ] Interview type
- [ ] Pipeline stage
- [ ] Date & time
- [ ] Duration
- [ ] Interviewers (all or just count?)
- [ ] Meeting link
- [ ] Interview prep document link
- [ ] Feedback status
- [ ] Notes/agenda
- [ ] Calendar sync status
- [ ] Reminder status

---

### 3. Actions & Functionality

**Q3.1: What actions should be available for each interview?**

**For Partners/TQC:**
- [ ] View candidate profile
- [ ] Join meeting
- [ ] Reschedule interview
- [ ] Cancel interview
- [ ] Add/edit notes
- [ ] Upload/view prep document
- [ ] Submit feedback
- [ ] View/edit feedback
- [ ] Add interviewer
- [ ] Remove interviewer
- [ ] Send reminder
- [ ] Mark as completed
- [ ] Mark as no-show
- [ ] Link to calendar event
- [ ] Unlink from calendar event

**For Candidates:**
- [ ] View interview details
- [ ] Join meeting
- [ ] Request reschedule
- [ ] Cancel interview (with reason)
- [ ] View prep materials
- [ ] Add notes/questions

**Q3.2: Bulk actions?**
- [ ] Select multiple interviews
- [ ] Bulk reschedule
- [ ] Bulk cancel
- [ ] Bulk send reminders
- [ ] Export to calendar (.ics file)
- [ ] Export to CSV

**Q3.3: Interview Prep Documents**
- [ ] Upload prep document per interview
- [ ] Link to job-specific prep template
- [ ] Auto-generate prep doc from candidate profile
- [ ] Share prep doc with interviewers
- [ ] Track who viewed prep doc

**Q3.4: Rescheduling**
- [ ] Who can reschedule? (Partners only? Candidates can request?)
- [ ] Should it update calendar automatically?
- [ ] Should it notify all participants?
- [ ] Should it require approval?
- [ ] Should it show available time slots?

**Q3.5: Feedback**
- [ ] Should feedback be visible to all stakeholders?
- [ ] Should candidates see feedback?
- [ ] Should there be a feedback deadline?
- [ ] Should there be reminders for pending feedback?
- [ ] Should feedback be required before advancing candidate?

---

### 4. Integration & Automation

**Q4.1: Calendar Integration**
- [ ] Show sync status (synced/not synced/error)
- [ ] Button to sync to calendar
- [ ] Button to create calendar event
- [ ] Show if interview was detected from calendar
- [ ] Show if interview was manually created
- [ ] Auto-sync new interviews to calendar
- [ ] Handle calendar conflicts

**Q4.2: Notifications & Reminders**
- [ ] Email reminders (24h before, 1h before)
- [ ] In-app notifications
- [ ] SMS reminders
- [ ] Calendar reminders
- [ ] Custom reminder settings per user
- [ ] Reminder status indicator

**Q4.3: Meeting Links**
- [ ] Auto-generate meeting links (Zoom, Google Meet, etc.)
- [ ] Support multiple platforms
- [ ] Show platform icon
- [ ] Test meeting link
- [ ] Regenerate meeting link

**Q4.4: Interview Detection**
- [ ] Auto-detect from calendar (already working)
- [ ] Auto-link to applications
- [ ] Auto-assign interviewers from job team
- [ ] Confidence scoring for detections
- [ ] Review queue for low-confidence detections

---

### 5. Manual Work Reduction

**Q5.1: What manual work is currently required?**
- [ ] Manually adding interviews that aren't in calendar
- [ ] Manually linking calendar events to applications
- [ ] Manually assigning interviewers
- [ ] Manually creating meeting links
- [ ] Manually updating interview status
- [ ] Manually submitting feedback
- [ ] Manually sending reminders
- [ ] Manually syncing to calendar

**Q5.2: What should be automated?**
- [ ] Auto-create booking from calendar detection
- [ ] Auto-link to application based on candidate email
- [ ] Auto-assign interviewers from job team
- [ ] Auto-generate meeting links
- [ ] Auto-sync to calendar
- [ ] Auto-send reminders
- [ ] Auto-update status (completed when time passes)
- [ ] Auto-create prep documents

---

### 6. UI/UX Improvements

**Q6.1: Current Issues**
- [ ] Too much manual entry required
- [ ] Hard to see all interviews across jobs
- [ ] No way to filter/search
- [ ] Actions are disabled (prep doc, reschedule)
- [ ] No calendar view
- [ ] No bulk actions
- [ ] Hard to see interviewer availability
- [ ] No interview analytics/metrics

**Q6.2: What views would be helpful?**
- [ ] List view (current)
- [ ] Calendar view (monthly/weekly/daily)
- [ ] Timeline view
- [ ] Kanban board (by status)
- [ ] Table view (with sortable columns)

**Q6.3: Mobile Experience**
- [ ] Should it work well on mobile?
- [ ] Should there be a mobile app?
- [ ] Should there be push notifications?

---

### 7. Permissions & Security

**Q7.1: Who can see what?**
- [ ] Partners: Only their company's jobs?
- [ ] TQC: All jobs?
- [ ] Candidates: Only their own interviews?
- [ ] Interviewers: Only interviews they're assigned to?

**Q7.2: Who can edit what?**
- [ ] Can candidates reschedule their own interviews?
- [ ] Can interviewers add notes?
- [ ] Can hiring managers cancel any interview?
- [ ] Can TQC override any action?

**Q7.3: What should be private?**
- [ ] Interviewer notes (only visible to team?)
- [ ] Feedback (only visible to hiring team?)
- [ ] Prep documents (only visible to interviewers?)

---

### 8. Analytics & Reporting

**Q8.1: What metrics should be shown?**
- [ ] Total upcoming interviews
- [ ] Interviews this week/month
- [ ] Interviews by type
- [ ] Interviews by job
- [ ] Average interviews per candidate
- [ ] Feedback completion rate
- [ ] Reschedule rate
- [ ] No-show rate
- [ ] Interview-to-offer conversion

**Q8.2: Should there be reports?**
- [ ] Weekly interview summary
- [ ] Monthly interview report
- [ ] Interviewer workload report
- [ ] Candidate interview history

---

## Recommended Next Steps

1. **Answer the questions above** to define requirements
2. **Prioritize features** based on manual work reduction
3. **Design the multi-stakeholder view** (if needed)
4. **Implement missing actions** (reschedule, prep docs, etc.)
5. **Add filtering and search**
6. **Add calendar view option**
7. **Automate manual processes**
8. **Add analytics dashboard**

---

## Technical Notes

### Current Database Tables Used
- `bookings` - Confirmed interview bookings
- `detected_interviews` - Calendar-detected interviews
- `applications` - Links interviews to candidates
- `job_team_assignments` - Determines interviewers
- `profiles` - User information

### Current Component Structure
- `UpcomingInterviewsWidget` - Main display component
- `ManualInterviewEntryDialog` - Manual entry
- `CalendarInterviewLinker` - Calendar linking
- `JobDashboard` - Parent page

### Potential New Components Needed
- `InterviewFilters` - Filtering UI
- `InterviewCalendarView` - Calendar view
- `InterviewActionsMenu` - Action menu
- `RescheduleInterviewDialog` - Rescheduling
- `InterviewPrepDocUpload` - Prep document management
- `InterviewFeedbackForm` - Feedback submission
- `InterviewAnalytics` - Metrics display

---

## Priority Features (Based on "Manual Work" Complaint)

1. **HIGH PRIORITY** - Auto-link calendar events to applications
2. **HIGH PRIORITY** - Auto-assign interviewers from job team
3. **HIGH PRIORITY** - Enable reschedule functionality
4. **HIGH PRIORITY** - Enable prep document upload/view
5. **MEDIUM PRIORITY** - Add filtering and search
6. **MEDIUM PRIORITY** - Calendar view
7. **MEDIUM PRIORITY** - Bulk actions
8. **LOW PRIORITY** - Analytics dashboard

---

**Please review and answer the questions above so we can build exactly what you need!**

