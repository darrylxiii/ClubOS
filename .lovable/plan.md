

# Full Audit: Rename QUIN to Club AI Everywhere

## Scope

There are **654+ references** to "QUIN" across **62 files** (47 frontend, 15 backend). This covers UI labels, system prompts, variable names, comments, agent identifiers, analytics events, and test files.

## All Files Requiring Changes

### Frontend Components (32 files)

| File | What to Change |
|---|---|
| `src/components/workspace/ai/AISlashCommandDialog.tsx` | "Ask QUIN to Write" and "Tell QUIN what you want" |
| `src/components/clubhome/NextBestActionCard.tsx` | "Powered by QUIN", "practice with QUIN", "QUIN has found roles", "Let QUIN analyze" |
| `src/components/admin/kpi/AIExecutiveSummary.tsx` | "Powered by QUIN Intelligence" |
| `src/components/admin/kpi/KPIReportBuilder.tsx` | "Include QUIN AI insights" |
| `src/components/admin/kpi/KPIForecastPanel.tsx` | "Powered by QUIN" |
| `src/components/meetings/InterviewerBackchannel.tsx` | "QUIN Suggests" tab label, `value="quin"` tab value |
| `src/components/meetings/MeetingIntelligenceHub.tsx` | "QUIN Insight" heading |
| `src/components/meetings/AIHighlightClips.tsx` | "have QUIN identify key moments" |
| `src/components/meetings/MeetingVideoCallInterface.tsx` | `onToggleQUINVoice`, `showQUINVoice` prop names |
| `src/components/meetings/ClubAIVoiceAssistant.tsx` | Invokes `quin-meeting-voice` edge function |
| `src/components/offers/OfferNegotiationChat.tsx` | "I'm QUIN, your AI negotiation advisor", invokes `quin-chat` |
| `src/components/partner/DailyBriefing.tsx` | "QUIN Daily Briefing", "Let QUIN analyze" |
| `src/components/partner/JobsAIInsightsWidget.tsx` | "Powered by QUIN" |
| `src/components/partner/jobs/JobsAIBanner.tsx` | "QUIN" label |
| `src/components/communication/ClubAIAdvisorWidget.tsx` | "Ask QUIN" comment |
| `src/components/crm/OutreachStrategist.tsx` | "I'm QUIN, your AI outreach strategist", "Ask QUIN about" placeholder |
| `src/components/candidate/AssessmentRecommendations.tsx` | "Powered by QUIN", "QUIN is analyzing" |
| `src/components/applications/CoverLetterPreview.tsx` | "QUIN Generated" badge |
| `src/components/booking/VoiceBookingWidget.tsx` | "QUIN is speaking" |
| `src/components/scheduling/SchedulingAITab.tsx` | "QUIN AI Insights" |
| `src/components/surveys/FeatureFeedback.tsx` | "Powered by QUIN", comment about QUIN AI |
| `src/components/agent/PartnerAgentWidget.tsx` | "QUIN suggests", "QUIN Alerts" |
| `src/components/agent/MemberAgentWidget.tsx` | "Powered by QUIN" |
| `src/components/ml/MLMatchScore.tsx` | "Powered by QUIN AI Matching Engine" |
| `src/components/clubpilot/PilotDashboard.tsx` | `quin` agent config key with label "QUIN" |
| `src/components/clubhome/CandidateHome.tsx` | Comment "QUIN Powered" |
| `src/pages/Home.tsx` | Comment "QUIN Next Best Action" |
| `src/pages/CoverLetterGenerator.tsx` | "Powered by QUIN" |

### Frontend Hooks / Services (4 files)

| File | What to Change |
|---|---|
| `src/hooks/useClubAIAnalytics.ts` | `QUINAnalytics` interface name, `quin-analytics` query key |
| `src/hooks/useFocusTimeDefender.ts` | Invokes `quin-focus-defender` edge function (3 calls) |
| `src/services/surveyTriggerService.ts` | `quinnUsageCount` parameter name |
| `src/services/analyticsService.ts` | `quin_recommendation_clicked` event, `quin_funnel_` prefix, `quin_engagement` funnel name |

### Test Files (1 file)

| File | What to Change |
|---|---|
| `src/components/clubhome/__tests__/NextBestActionCard.test.tsx` | "QUIN branding" comment, regex `/powered by quin/i` |

### Edge Functions - System Prompts (10 files)

Every one of these has `"You are QUIN"` in the system prompt that must become `"You are Club AI"`:

| File | Prompt Count |
|---|---|
| `supabase/functions/ai-chat/index.ts` | 2 (system prompt + knowledge base mention) |
| `supabase/functions/ai-writing/index.ts` | 8 (one per operation: improve, summarize, expand, translate, generate, simplify, professional, casual) |
| `supabase/functions/whatsapp-booking-handler/index.ts` | 1 |
| `supabase/functions/voice-booking-handler/index.ts` | 1 |
| `supabase/functions/generate-meeting-dossier-360/index.ts` | 1 |
| `supabase/functions/generate-cover-letter/index.ts` | 1 |
| `supabase/functions/generate-assessment-insights/index.ts` | 1 |
| `supabase/functions/resolve-scheduling-conflict/index.ts` | 1 |
| `supabase/functions/quin-meeting-voice/index.ts` | 5 (multiple command handlers) + action log `quin_voice_command` |
| `supabase/functions/auto-generate-follow-up/index.ts` | 1 |

### Edge Functions - Agent Identity (3 files)

These use `'quin'` as an agent_name identifier in database entries:

| File | What to Change |
|---|---|
| `supabase/functions/agent-orchestrator/index.ts` | `agent_name: 'quin'` (multiple), `assignedAgents` arrays |
| `supabase/functions/agent-event-processor/index.ts` | `agent_name: 'quin'`, agent mappings |
| `supabase/functions/analyze-agent-performance/index.ts` | `agent_name: 'quin'` in queries and upserts |

### Edge Functions - Feedback (1 file)

| File | What to Change |
|---|---|
| `supabase/functions/collect-rag-feedback/index.ts` | "helps QUIN learn", "QUIN will improve" |

## Replacement Rules

All changes follow a simple find-and-replace pattern:

| Old | New |
|---|---|
| `QUIN` (UI labels) | `Club AI` |
| `Powered by QUIN` | `Powered by Club AI` |
| `Ask QUIN` | `Ask Club AI` |
| `I'm QUIN` | `I'm Club AI` |
| `You are QUIN` (system prompts) | `You are Club AI` |
| `QUIN Suggests` | `Club AI Suggests` |
| `QUIN Alerts` | `Club AI Alerts` |
| `QUIN Daily Briefing` | `Club AI Daily Briefing` |
| `QUIN AI` (in descriptive text) | `Club AI` |
| `QUIN Intelligence` | `Club AI Intelligence` |
| `QUIN Generated` | `Club AI Generated` |
| `QUIN is speaking` | `Club AI is speaking` |
| `QUIN is analyzing` | `Club AI is analyzing` |
| `QUINAnalytics` (interface) | `ClubAIAnalytics` |
| `quin-analytics` (query key) | `club-ai-analytics` |
| `quinnUsageCount` (param) | `clubAIUsageCount` |
| `quin_recommendation_clicked` | `club_ai_recommendation_clicked` |
| `quin_funnel_` | `club_ai_funnel_` |
| `quin_engagement` | `club_ai_engagement` |
| `quin_voice_command` | `club_ai_voice_command` |
| `agent_name: 'quin'` (DB entries) | `agent_name: 'club_ai'` |
| `value="quin"` (tab) | `value="club-ai"` |
| `onToggleQUINVoice` / `showQUINVoice` | `onToggleClubAIVoice` / `showClubAIVoice` |

## Important Notes

### Agent name in database

Changing `agent_name: 'quin'` to `'club_ai'` in the orchestrator, event processor, and performance analyzer means existing rows in `agent_decision_log`, `agent_behavior_rules`, and `agent_communications` with `agent_name = 'quin'` will no longer match queries. This is acceptable for a clean break, but existing historical data will reference the old name.

### Edge function names

The edge functions `quin-meeting-voice` and `quin-focus-defender` are deployed function names. Renaming them would require creating new functions and updating all call sites. The recommended approach: keep the function folder names as-is for now (they are internal) but rename all user-facing strings and system prompts inside them. This avoids deployment churn.

### i18n translation keys

The `NextBestActionCard` uses a translation key `common:quin.nextStep` with fallback "Powered by QUIN". The key should be updated to `common:clubAI.nextStep` with fallback "Powered by Club AI". Since no locales directory was found, this is likely handled inline via the fallback.

### Test file

The test assertion `/powered by quin/i` must change to `/powered by club ai/i`.

## Execution Order

1. Backend edge functions first (system prompts, agent names, feedback text) -- 14 files
2. Frontend components (UI labels, badge text, comments) -- 32 files
3. Hooks and services (variable names, event names, query keys) -- 4 files
4. Test file -- 1 file
5. Deploy updated edge functions

Total: **51 files**, all string/naming replacements, zero logic changes.
