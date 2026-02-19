

# Lovable Cloud AI Credit Audit — Where Every Dollar Goes

## The Big Picture

Your project has **82 edge functions** calling the Lovable AI gateway, plus **11 functions** generating embeddings. This is an unusually large AI surface area. Here is a breakdown of every credit-consuming category, ranked by estimated cost impact.

---

## Category 1: Club AI Chat (Estimated 40-60% of spend)

**Function:** `club-ai-chat/index.ts` (2,173 lines)

This is your main AI copilot. It is by far the most expensive function because:

- **Massive system prompts**: The system prompt includes full role-based context (emails, calendar, tasks, pipeline data, financial data) — likely 5,000-10,000+ tokens per request before the user even types anything
- **Streaming with tool calls**: It sends tools definitions (search, CRM, candidate lookup, etc.) with every request, adding thousands of tokens
- **"Think" mode uses `gemini-2.5-pro`**: The most expensive model, triggered whenever a user selects "Deep Think" mode
- **Users can select GPT-5 or GPT-5 Mini**: These are premium models
- **No conversation truncation visible**: Full conversation history is sent each time, growing linearly with conversation length

### Savings opportunities:
- Truncate conversation history to last N messages (e.g., 10-15) instead of sending everything
- Compress system prompt — much of the role-based instruction text is redundant per-request
- Default to `gemini-2.5-flash-lite` for simple queries; only escalate to flash/pro when needed
- Limit tool definitions to only relevant ones per query instead of sending all tools every time

---

## Category 2: Placeholder Generator (Estimated 5-10% — wasteful)

**Function:** `generate-placeholders/index.ts`

**Problem:** This fires on **every message change** (with only a 2-second debounce). Every time the conversation updates, it calls the AI to generate 5 placeholder suggestions. For an active user sending 20 messages, that is 20 extra AI calls just for input hints.

### Savings: Remove this entirely or replace with a static rotation of pre-written placeholders. This is pure waste.

---

## Category 3: Embeddings (Estimated 10-15%)

**11 functions** call `/v1/embeddings`:

| Function | Trigger |
|---|---|
| `generate-embeddings` | General-purpose |
| `batch-generate-embeddings` | Batch processing |
| `semantic-search` | Every semantic search query |
| `auto-match-candidates` | Candidate matching |
| `enrich-candidate-profile` | Profile enrichment |
| `retrieve-context` | RAG context retrieval (also does a chat completion for query expansion + reranking = 3 AI calls per query) |
| `ingest-company-dna` | Company knowledge base |
| `process-external-import` | External data imports |
| `embed-meeting-intelligence` | Meeting processing |
| `generate-user-embeddings` | User profile embeddings |
| `backfill-meeting-embeddings` | Backfill operations |

### Savings: Embeddings are relatively cheap per call but volume matters. Cache embedding results and skip re-embedding unchanged content.

---

## Category 4: Meeting/Recording Analysis (Estimated 5-10%)

| Function | Token budget | Notes |
|---|---|---|
| `analyze-meeting-recording-advanced` | 4,000 + 2,000 + 1,000 per chunk | Multiple AI calls per recording. Chunked transcripts can trigger 5-10+ calls per meeting |
| `analyze-meeting-transcript` | Unbounded | Full transcript analysis |
| `auto-generate-follow-up` | Unbounded | Generates follow-up emails post-meeting |
| `generate-meeting-dossier-360` | 1,000 | Pre-meeting intelligence |
| `compile-meeting-transcript` | N/A | Not AI but triggers downstream AI |

### Savings: Process recordings once and cache results. Skip re-analysis on repeated views.

---

## Category 5: Candidate/Profile Enrichment (Estimated 5-8%)

| Function | What it does |
|---|---|
| `enrich-candidate-profile` | AI summary + embedding (2 AI calls) |
| `generate-candidate-dossier` | Full candidate dossier |
| `generate-candidate-brief` | 360-degree brief |
| `calculate-match-score` | AI-powered matching |
| `parse-resume` | CV parsing (4,000 max tokens) |
| `generate-cover-letter` | Cover letter generation (1,500 tokens) |

### Savings: Cache enrichment results. Do not re-enrich profiles that have not changed.

---

## Category 6: Email/Communication AI (Estimated 5-8%)

| Function | Trigger |
|---|---|
| `analyze-email-reply` | Analyzing email replies (1,500 tokens) |
| `analyze-email-sentiment` | Sentiment per email |
| `assist-email-writing` | Email writing help (500 tokens) |
| `ai-email-generator` | Full email generation |
| `generate-crm-reply` | CRM reply drafts |
| `generate-quick-reply` | Quick reply suggestions |
| `populate-email-intelligence` | Background email processing |
| `analyze-whatsapp-conversation` | WhatsApp analysis |
| `generate-whatsapp-smart-replies` | WhatsApp reply suggestions |

### Savings: Batch email sentiment analysis instead of per-email. Rate limit email AI features.

---

## Category 7: Analytics/Insights Generation (Estimated 3-5%)

| Function | What |
|---|---|
| `generate-kpi-insights` | KPI briefing |
| `generate-analytics-insights` | Analytics summary |
| `generate-daily-briefing` | Daily executive briefing |
| `generate-daily-outreach-insights` | Outreach insights |
| `generate-activity-insights` | Activity summary |
| `generate-company-insights` | Company intelligence |
| `generate-partner-insights` | Partner analytics |
| `analytics-ai-assistant` | Interactive analytics Q&A |

### Savings: Generate daily briefings once per day and cache. Do not regenerate on every page view.

---

## Category 8: Specialized AI Functions (Estimated 5-10%)

| Function | Purpose |
|---|---|
| `retrieve-context` | RAG pipeline — 3 AI calls per query (expansion + embedding + reranking) |
| `detect-hallucinations` | Verifies AI output accuracy |
| `build-knowledge-graph` | Knowledge extraction |
| `run-headhunter-agent` | Agentic search |
| `club-pilot-orchestrator` | Task prioritization |
| `interview-prep-chat` | Interview coaching |
| `predict-hiring-outcomes` | Predictive analytics |
| `learn-from-outcomes` | Pattern learning |
| `ai-course-generator` | Course content |
| `batch-translate` | Translation |
| `compress-context` | Context compression |

---

## Top 5 Immediate Savings (Implementation Plan)

### 1. Kill `generate-placeholders` — Save ~5-10%
Replace the AI call with a static array of rotating placeholders. Zero value for the cost.

### 2. Truncate Club AI Chat context — Save ~15-25%
- Cap conversation history at 15 messages
- Compress system prompt (remove verbose instructions, use concise directives)
- Only send tool definitions relevant to the detected query intent
- Default to `gemini-2.5-flash-lite` for simple questions

### 3. Cache enrichment/embeddings — Save ~5-10%
- Skip `enrich-candidate-profile` if profile has not changed since last enrichment
- Cache `semantic-search` embeddings for repeated queries
- Skip `retrieve-context` query expansion for short, clear queries

### 4. Batch meeting analysis — Save ~3-5%
- Process meeting recordings once, store results, serve from cache on subsequent views

### 5. Rate-limit analytics generators — Save ~3-5%
- Generate daily briefings once per day (not per page load)
- Cache KPI insights for 1 hour

### Estimated total savings: 30-55% of current AI spend

---

## Technical Implementation

All changes are in edge functions (backend) — no database schema changes needed.

### Files to modify:
1. `src/pages/ClubAI.tsx` — Remove `generate-placeholders` call, use static placeholders
2. `supabase/functions/club-ai-chat/index.ts` — Truncate history, compress prompt, model routing
3. `supabase/functions/generate-placeholders/index.ts` — Delete or convert to static
4. `supabase/functions/retrieve-context/index.ts` — Add query-complexity check to skip expansion for simple queries
5. `supabase/functions/enrich-candidate-profile/index.ts` — Add cache check (skip if recently enriched)
6. `supabase/functions/generate-kpi-insights/index.ts` — Add cache TTL
7. `supabase/functions/generate-daily-briefing/index.ts` — Add once-per-day guard

