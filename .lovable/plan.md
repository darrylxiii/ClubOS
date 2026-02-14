
## Issue 1: Email Verification Audit (Separate Task)
The email verification system for membership requests shows a **66% success rate** (39/59 deliveries since Jan 2026). Root causes:
- **Domain configuration**: Resend likely has SPF/DKIM/DMARC misconfigurations for `thequantumclub.nl`
- **Provider blocks**: Yahoo and corporate domains (closedin.io, binnenbouwers.nl) showing 0% delivery
- **Missing telemetry**: The `send-verification-code` function has no error logging to Resend API responses
- **Input typos**: Database has unvalidated email addresses (gmail.con, hotmaill.com)

**Recommended fixes:**
1. Add enhanced logging to `send-verification-code` edge function to capture Resend API responses
2. Create a database audit query to identify problematic domains
3. Add email domain typo detection in onboarding (Did you mean gmail.com?)
4. Implement SMS fallback for verified phone numbers
5. Verify SPF/DKIM/DMARC records in Resend dashboard for thequantumclub.nl

This will be tracked separately once the current task is complete.

---

## Issue 2: Agenda Widget - Show 5 Upcoming Meetings

### Current Behavior
- `ActiveMeetingsWidget.tsx` fetches meetings using `startOfDay(now)` to `endOfDay(now)` — only today's meetings
- Displays all today's meetings, with header showing "Today's Agenda"
- No date indicators when there are multiple meetings

### Proposed Changes

**1. Modify Data Fetching (ActiveMeetingsWidget.tsx)**
- Change date range from today-only to **next 5 days** (today + 4 more days)
- Use `startOfDay(now)` to `endOfDay(addDays(now, 4))`
- Limit results to max 5 meetings via `.slice(0, 5)`
- Keep existing filtering and status computation

**2. Update Header Logic**
- Detect if all events are today: show "Today's Agenda"
- If events span multiple days: show "Upcoming Meetings" instead
- Remove the specific date label and replace with dynamic indicator

**3. Add Date Display for Multi-Day Events**
- Group events by date internally (for rendering purposes)
- When rendering each event row, check if it's a different day than the previous event
- If date changed, inject a **subtle date separator** or show date inline with time

**Two rendering approaches:**

**Approach A (Date Separators)**: Insert a divider before each new date
```
🗓️ Today
├─ 9:00 AM - Client Meeting
├─ 2:00 PM - Interview Round 1

🗓️ Friday, Feb 14
├─ 10:00 AM - Panel Interview
├─ 3:30 PM - Technical Review

🗓️ Monday, Feb 17
├─ 11:00 AM - Final Interview
```

**Approach B (Inline Date)**: Show date in the time column when it's not today
```
9:00 AM      Client Meeting
2:00 PM      Interview Round 1

Tomorrow 10:00 AM    Panel Interview
Tomorrow 3:30 PM     Technical Review

Feb 17 11:00 AM      Final Interview
```

**Recommendation**: Use **Approach B (Inline Date)** since it's more compact and fits the existing glass-subtle card aesthetic. It adds a single line per date change without extra visual clutter.

**4. Implementation Details**
- Reuse existing `format()` calls from date-fns
- Add helper function to determine if date changed between events
- For non-today dates, prepend date label: `formatDate(e.start, 'EEE, MMM d')` followed by time
- Update header logic to say "Upcoming Meetings" if span > 1 day
- Keep all other status badges, join buttons, and behavior identical

**5. Files to Modify**
- `src/components/clubhome/ActiveMeetingsWidget.tsx` (only file, ~80 lines changed)
  - Import `addDays` from date-fns
  - Change date range calculation in useEffect
  - Add `.slice(0, 5)` to limit results
  - Add date grouping/comparison logic in render loop
  - Update header condition

### Design Decisions
- **5 meetings max**: Keeps card height reasonable (~300-400px max), user can click "View Full Calendar" for more
- **Limit to 5 days ahead**: Beyond that, meetings are far-future context; cards remain scannable
- **No cost/complexity**: Uses existing `fetchUnifiedCalendarEvents`, just different date range
- **Maintains glass aesthetic**: Subtle date labels, no extra visual breaks beyond current design
- **Backward compatible**: All existing status badges, join buttons, and styling unchanged
