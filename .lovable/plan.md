
# Agentic OS: Enterprise Command Center Rebuild

## The Problem

The current Agentic OS Hub is four bare tables with zero visual hierarchy, no interactivity beyond "Ack" buttons, and no way to communicate with agents. It looks like a developer debug panel, not an enterprise command center. There is also no mechanism to talk to individual agents, give them instructions, or have them learn from your feedback.

## What This Plan Delivers

### 1. Complete Visual Redesign of the Hub

Replace the four flat table views with an enterprise-grade mission control layout:

**Header Zone** -- System health strip across the top showing:
- Heartbeat pulse indicator (green dot animating if last run < 20 min ago, red if stale)
- Live counters: Events Processed, Signals Active, Agents Online, Tasks Created (last 24h)
- System uptime percentage calculated from heartbeat logs

**Tab 1: Mission Control (replaces Heartbeat Logs)**
- Top row: 4 stat cards (Heartbeat Runs Today, Avg Duration, Error Rate, Agents Active)
- Timeline visualization: vertical timeline of heartbeat runs with expandable detail panels showing which agents ran and results
- Error spotlight: any errors bubble up in a red-bordered alert card with agent name and message

**Tab 2: Intelligence Feed (replaces Predictive Signals)**
- Card grid layout instead of table -- each signal gets a glass card with:
  - Large icon (flame/snowflake/alert/trend) with color glow
  - Entity name resolved from the database (actual company/candidate name, not UUID)
  - Signal strength as a visual meter bar
  - Evidence summary (parsed from JSON)
  - Recommended action as a primary button
  - "Dismiss" and "Investigate" secondary actions
- Filters: by signal type, strength threshold, entity type
- Empty state: illustration with "No signals detected -- your agents are monitoring"

**Tab 3: Agent Directory (replaces Agent Activity)**
- Grid of agent cards, one per registered agent (6 agents from the registry)
- Each card shows: avatar/icon, display name, autonomy level badge, capabilities as tags, status indicator (active/idle based on recent decisions), last action timestamp
- Click an agent card to open the **Agent Chat Panel** (see below)
- Below the grid: a scrollable decision log (the existing table, but styled better with icons and grouped by agent)

**Tab 4: Briefings (redesigned)**
- Calendar-style date picker to browse briefings
- Selected briefing renders as a formatted document with sections (Signals, Actions, Priorities, Meetings) instead of raw JSON badges
- "Generate Now" button to manually trigger a briefing for today

**Tab 5: Agent Chat (new)**
- Dedicated conversational interface for talking to any agent
- Agent selector dropdown at the top (populated from agent_registry)
- Chat messages with agent avatar, streaming responses via Lovable AI
- The agent's system_prompt from the registry is used as the base prompt
- Full conversation history persisted per agent in a new `agent_conversations` table
- The agent has access to its own decision history, memory, and context
- Admin can give instructions like "Focus on tech companies this week" which get stored as agent preferences
- Admin can review a past decision and mark it as "good" or "bad" -- this feedback gets stored and included in the agent's context for future decisions

### 2. Agent Memory and Learning Loop

**Database additions:**
- `agent_conversations` table: stores chat history per agent per admin user
- `agent_feedback` table: stores admin ratings (thumbs up/down + text) on agent decisions, linked to `agent_decision_log`
- `agent_instructions` table: stores standing instructions given to agents by admins (e.g., "Prioritize fintech roles this quarter")

**Edge function: `agent-chat`**
- New edge function that powers the Agent Chat tab
- Receives: agent_name, messages, userId
- Loads: agent's system_prompt from registry, agent's recent decisions, agent's feedback history, agent's standing instructions, relevant memories
- Calls Lovable AI (google/gemini-3-flash-preview) with full context
- Streams response back
- Stores conversation in agent_conversations
- When the agent receives feedback on a decision, it stores it in agent_feedback and the next time the agent runs, the heartbeat includes recent feedback in the agent's context

**Learning loop flow:**
```text
Admin reviews decision --> rates good/bad + comment
    --> stored in agent_feedback
    --> next heartbeat loads recent feedback
    --> agent context includes "Your admin rated X as bad because Y"
    --> agent adjusts behavior
```

### 3. Standing Instructions System

Admins can give agents persistent instructions that carry across all runs:
- "Headhunter: only source candidates with 5+ years for senior roles"
- "Engagement Agent: always follow up within 24 hours"
- "Analytics Agent: generate weekly pipeline reports every Monday"

These are stored in `agent_instructions` and injected into the agent's system prompt context during every invocation (heartbeat + chat).

### 4. Implementation Order

1. **Database migration**: Create `agent_conversations`, `agent_feedback`, `agent_instructions` tables with RLS
2. **Edge function**: Create `agent-chat` with Lovable AI streaming, context loading, memory persistence
3. **Hub redesign -- Header**: System health strip component with live counters
4. **Hub redesign -- Mission Control tab**: Stat cards + timeline replacing the flat table
5. **Hub redesign -- Intelligence Feed tab**: Signal cards with resolved entity names
6. **Hub redesign -- Agent Directory tab**: Agent cards grid from registry + decision log
7. **Hub redesign -- Briefings tab**: Formatted document view + "Generate Now" button
8. **Hub redesign -- Agent Chat tab**: Full conversational interface with agent selector, streaming, feedback buttons
9. **Update AgenticOSHub.tsx**: New 5-tab layout with redesigned header
10. **Update heartbeat**: Include recent feedback and instructions in agent context when invoking agents

## Technical Details

### New Database Tables

```text
agent_conversations
  - id (uuid PK)
  - agent_name (text, FK agent_registry)
  - user_id (uuid, FK profiles)
  - messages (jsonb[])
  - created_at, updated_at
  - RLS: admin only

agent_feedback
  - id (uuid PK)
  - decision_id (uuid, FK agent_decision_log)
  - agent_name (text)
  - user_id (uuid)
  - rating ('positive' | 'negative' | 'neutral')
  - comment (text)
  - created_at
  - RLS: admin only

agent_instructions
  - id (uuid PK)
  - agent_name (text)
  - instruction (text)
  - priority (int)
  - is_active (boolean default true)
  - created_by (uuid)
  - created_at, updated_at
  - RLS: admin only
```

### New Edge Function: `agent-chat`
- Uses Lovable AI gateway with streaming
- Loads agent system_prompt + recent decisions + feedback + instructions as context
- Persists conversation history
- Supports special commands: `/instruct` to add standing instructions, `/feedback` to rate a decision

### New Frontend Components (in `src/components/admin/agentic/`)
- `AgenticSystemHealth.tsx` -- header health strip
- `MissionControlView.tsx` -- replaces HeartbeatLogs with stat cards + timeline
- `IntelligenceFeedView.tsx` -- replaces PredictiveSignalsView with card grid
- `AgentDirectoryView.tsx` -- agent cards from registry + decision log
- `BriefingDocumentView.tsx` -- replaces DailyBriefingsView with formatted display
- `AgentChatView.tsx` -- full chat interface with agent selector
- `AgentChatPanel.tsx` -- the streaming chat component
- `AgentFeedbackButton.tsx` -- thumbs up/down on decisions
- `AgentInstructionsPanel.tsx` -- manage standing instructions per agent

### Modified Files
- `src/pages/admin/AgenticOSHub.tsx` -- complete redesign with 5 tabs + health header
- `supabase/functions/agentic-heartbeat/index.ts` -- inject feedback + instructions into agent context
- `supabase/config.toml` -- register new agent-chat function

### Design Aesthetic
- Dark glass cards (`bg-card/50 backdrop-blur-sm border border-border/50`)
- Gold accent for active/important elements
- Subtle pulse animations on live indicators
- Agent avatars with colored status rings (green = active, amber = idle, red = error)
- Monospace font for system metrics, sans-serif for content
- Generous whitespace, no clutter -- one primary action per card
