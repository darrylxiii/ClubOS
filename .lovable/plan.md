
# Agentic OS Audit: Making The Quantum Club 0.1% Efficient

## Current State Assessment

### What Already Exists (Strong Foundation)

The platform has significant agentic infrastructure already built but largely **dormant or disconnected**:

| Layer | Component | Status |
|-------|-----------|--------|
| Agent Orchestrator | Goal creation, execution plans, task delegation | Built, barely wired to UI |
| Event Processor | Autonomous actions, autonomy levels, event routing | Built, no cron trigger |
| Memory Manager | Store, retrieve, decay, consolidate, preferences | Built, used only by Club AI chat |
| Club Pilot | AI task generation, auto-scheduling | Built, manual trigger only |
| Predictive Signals | Company cooling/heating, hiring intent, stalling | Built, no cron trigger |
| Headhunter Agent | AI candidate matching against jobs | Built, manual button only |
| Stalled Candidates | Detect 7+ day stuck candidates, create tasks | Built, no cron trigger |
| CRM Automation | Stage-change triggers, auto-tasks | Built, requires DB webhook setup |
| Focus Time Defender | Protect deep work blocks | Built, UI exists |
| Post-Meeting Automation | Action items, follow-ups from transcripts | Built, wired to meeting panel |

### The Gap: Nothing Runs Automatically

The single biggest gap: **almost none of these agents run on a schedule**. Only 3 cron jobs exist (booking reminders, data integrity, region health). The entire agentic layer sits idle waiting to be manually invoked.

---

## The Plan: 5 High-Impact Agentic Upgrades

### 1. Agentic Heartbeat (Cron Backbone)

**Problem**: Agents exist but never wake up on their own.

**Solution**: Add a single `agentic-heartbeat` edge function that runs on a cron schedule (every 15 minutes during business hours, hourly otherwise). It orchestrates all background agents:

- Process pending agent events (`agent-event-processor`)
- Detect predictive signals (`detect-predictive-signals`)
- Check for stalled candidates (`check-stalled-candidates`)
- Apply memory decay (`agent-memory-manager` with `decay` operation)
- Run Club Pilot task generation for users with auto-schedule enabled

**Database**: One new cron job via migration. One new `agentic_heartbeat_log` table for observability.

### 2. Autonomous Action Dashboard (Admin Home Widget)

**Problem**: Even when agents act, admins have zero visibility into what AI did overnight.

**Solution**: Replace the `RecentActivityFeed` in Zone 4 with a dual-panel:
- Left: **Agent Activity Log** -- what AI did autonomously (emails sent, tasks created, signals detected, candidates flagged)
- Right: **Pending Approvals** -- actions the AI wants to take but needs human sign-off (based on autonomy_level = 'suggest')

Data comes from existing `agent_decision_log` and `ai_suggestions` tables.

### 3. Predictive Signal Cards on Admin Home

**Problem**: Predictive signals (company cooling off, hiring intent, stalled jobs) are detected but never surfaced.

**Solution**: Add a new Zone 2.5 section: `PredictiveSignalsStrip` -- a horizontal scrollable strip of signal cards showing:
- Signal type icon (fire for heating up, snowflake for cooling, alert for risk)
- Entity name (company/candidate/job)
- Signal strength as a colored indicator
- One-click action button (the first `recommended_action`)
- Dismiss/acknowledge button

Data: Query `predictive_signals` where `is_active = true AND acknowledged = false`.

### 4. Auto-Headhunter on Job Publish

**Problem**: The headhunter agent requires a manual button click per job.

**Solution**: Wire `run-headhunter-agent` to trigger automatically when a job status changes to `open`. This is done via:
- A database trigger on `jobs` table that publishes an agent event
- The heartbeat picks it up and invokes the headhunter agent
- Results (matched candidates) surface as Club Pilot tasks for the strategist

No new edge function needed -- just a DB trigger + event routing in the event processor.

### 5. Smart Daily Briefing (Morning Digest)

**Problem**: Admins start the day with no context. They have to click through multiple screens.

**Solution**: Create a `generate-daily-briefing` edge function that runs at 7 AM via cron and compiles:
- Predictive signals detected overnight
- Stalled candidates count
- Today's meetings (from unified calendar)
- Revenue pipeline changes
- Agent actions taken autonomously
- Top 3 recommended actions for the day

Delivered as:
- An in-app notification card at the top of Admin Home (dismissible)
- Optionally via email (using existing `send-email` function)

---

## Technical Implementation Details

### Database Changes (Migration)

```text
1. CREATE TABLE agentic_heartbeat_log (
     id, run_at, agents_invoked, results, duration_ms, errors
   )
2. ALTER TABLE predictive_signals ADD COLUMN acknowledged_at TIMESTAMPTZ
3. CREATE TRIGGER on jobs table for status -> 'open' that inserts into agent_events
4. New cron job: agentic-heartbeat every 15 minutes
5. New cron job: daily-briefing at 07:00 Europe/Amsterdam
```

### New Edge Functions

1. `agentic-heartbeat` -- the cron backbone that wakes all agents
2. `generate-daily-briefing` -- morning digest compiler

### New Frontend Components

1. `src/components/clubhome/PredictiveSignalsStrip.tsx` -- horizontal signal cards
2. `src/components/clubhome/AgentActivityWidget.tsx` -- replaces/augments RecentActivityFeed with agent decisions + pending approvals
3. `src/components/clubhome/DailyBriefingBanner.tsx` -- dismissible morning briefing card

### Modified Files

1. `src/components/clubhome/AdminHome.tsx` -- add new zones for signals strip, agent activity, and briefing banner
2. `supabase/functions/agent-event-processor/index.ts` -- add `INSERT_jobs` event mapping to trigger headhunter

### Execution Order

1. Database migration (tables, triggers, cron jobs)
2. `agentic-heartbeat` edge function (the backbone)
3. `generate-daily-briefing` edge function
4. Frontend: PredictiveSignalsStrip component
5. Frontend: AgentActivityWidget component  
6. Frontend: DailyBriefingBanner component
7. AdminHome layout update (wire everything together)
8. Event processor update (add job publish trigger)

---

## Impact Summary

| Before | After |
|--------|-------|
| Agents wait for manual clicks | Agents run every 15 minutes autonomously |
| Predictive signals sit in DB unseen | Signals surface as actionable cards on dashboard |
| Headhunter requires manual trigger per job | Headhunter runs automatically on job publish |
| Admin starts day blind | Morning briefing with overnight AI actions + top priorities |
| No visibility into AI decisions | Full agent activity log with approve/dismiss workflow |

This transforms the platform from a tool where humans drive every action into an operating system where AI handles routine decisions, surfaces intelligence proactively, and only escalates when human judgment is needed.
