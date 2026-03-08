

# Club Meetings System — Comprehensive Ecosystem Audit

## Scope
This audit covers not just the in-meeting WebRTC experience, but the **entire meetings ecosystem**: scheduling, pre-meeting prep, live intelligence, recording, post-meeting analysis, data distribution to candidates/jobs/companies, and cross-system integrations.

---

## PART 1: FUNCTIONALITY SCORE (0/100)

This measures "does this feature actually work end-to-end when a user clicks through?"

| Area | Max | Score | Verdict |
|------|-----|-------|---------|
| **Scheduling & Calendar** | 8 | 6 | `CreateMeetingDialog` + `UnifiedCalendarView` + `ScheduleFromPipelineButton` exist. Calendar conflict detection hook present. BUT: no verified bi-directional Google/Outlook sync from client (only edge functions exist). No timezone-aware scheduling UI. |
| **Pre-Call Diagnostics** | 5 | 5 | Device selection, network test, video preview. Solid. |
| **WebRTC Core (P2P + SFU)** | 10 | 9 | Auto-switch at 3+ remotes. ICE restart, retry, reconnection. -1: TURN banner wired but `turnUnavailable` state source needs verification. |
| **Video Grid & Controls** | 8 | 7 | Gallery pagination, pin-to-focus, active speaker sort, keyboard shortcuts, meeting timer, mobile controls. -1: Connection quality bars use prop `connectionQuality` but `peerStats` from `useMeetingConnectionQuality` mapping may not produce per-participant keys matching participant IDs. |
| **Recording** | 8 | 6 | Compositor recording with consent. `isCompositorRecording` is single source of truth. -1: No SFU-mode recording. -1: Recordings saved to `meeting-recordings` storage bucket but no verification that bucket RLS allows authenticated reads for playback. |
| **Live Transcription** | 8 | 6 | ElevenLabs + Web Speech dual path works. Streaming captions via `useStreamingTranscription`. -1: Server-side `transcribe-meeting-audio` never invoked as fallback. -1: `compile-meeting-transcript` requires `is_final` flag on segments — unclear if ElevenLabs/WebSpeech path sets this. |
| **Live Interview Analysis** | 5 | 4 | `LiveInterviewAnalysis` component invokes `analyze-interview-realtime`. `InterviewScoringDashboard` shows live scores. `InterviewPrepPanel` generates prep briefs. -1: All three require `meeting.candidate_id` and `meeting.job_id` to be set — if meeting created without these, panels are empty. |
| **Chat & Reactions** | 5 | 4 | Realtime chat + emoji reactions + on-screen reaction overlay. -1: No file/image sharing in chat. |
| **Recording Analysis Pipeline** | 10 | 8 | Full pipeline: `transcribe-recording` → `analyze-meeting-recording-advanced` (870 lines, circuit breaker, retry, fallback model) → stores to `meeting_recordings_extended`. Chains to `embed-meeting-intelligence`. -1: Uses `OPENAI_API_KEY` for Whisper transcription — not using Lovable AI. -1: `meeting-debrief` function queries old `meeting_recordings` table, not `meeting_recordings_extended` — two separate recording tables exist creating confusion. |
| **Data Distribution to Entities** | 10 | 7 | `analyze-meeting-recording-advanced` writes to `candidate_interview_recordings` and `job_interview_recordings` (lines 705-737). `bridge-meeting-to-intelligence` creates `company_interactions`, `entity_relationships`, `intelligence_timeline` entries. `bridge-meeting-to-pilot` creates `pilot_tasks` from action items. BUT: -1: No client-side trigger for `bridge-meeting-to-intelligence` — must be called manually or via missing automation. -1: `extract-candidate-performance` uses `OPENAI_API_KEY` (not Lovable AI). -1: No path to save transcript to interviewer's profile for coaching/pattern analysis from the client. |
| **Post-Meeting Automation** | 8 | 5 | `PostMeetingPanel` + `usePostMeetingAutomation` exist. `auto-generate-follow-up` edge function generates action items. `send-meeting-summary-email` sends branded HTML email via Resend. BUT: -1: `meeting_follow_ups`, `meeting_action_items`, `meeting_roi_metrics` tables are queried with `as any` casts — may not exist in schema. -1: `sendFollowUpEmail` just updates status, doesn't actually invoke `send-email`. -1: No automatic trigger — user must manually click "Generate Follow-up". |
| **Notetaker (External Meeting Bot)** | 5 | 3 | `schedule-notetaker-sessions`, `notetaker-join-meeting`, `notetaker-collect-artifacts` edge functions exist. Uses Google Meet REST API for transcript polling. -1: Requires Google Workspace OAuth scope not typically available. -1: No UI feedback for notetaker status during external meetings. |
| **Meeting History & Search** | 5 | 4 | `MeetingHistoryTab` has search, type filter, upload, Fathom/Fireflies sync buttons. `GlobalRecordingSearch` searches across transcripts. `RecordingPlaybackPage` (963 lines) with video player, timestamped transcript, speaking metrics, clips, dossier generation, share dialog, PDF export. -1: No date range filter. |
| **Embeddings & RAG** | 5 | 3 | `embed-meeting-intelligence` generates embeddings for `meeting_candidate`, `meeting_job`, `meeting_interviewer`, `interaction` entity types. `backfill-meeting-embeddings` exists. BUT: -1: Requires `OPENAI_API_KEY` for embedding generation (not using Lovable AI which doesn't support embeddings). -1: No client-side semantic search UI that queries these embeddings. |
| **Speaking Metrics** | 3 | 3 | `calculate-speaking-metrics` computes per-speaker talk time, interruptions, turn-taking from `transcript_json`. `SpeakingMetricsPanel` visualizes it in recording playback. |
| **Highlight Clips** | 3 | 3 | `generate-highlight-clips` uses AI to identify key moments. `AIHighlightClips` + `RecordingClipCreator` UI components. |
| **Security & Consent** | 5 | 5 | E2E encryption toggle, recording consent modal with decline option, guest approval flow, password-protected meetings. |

**FUNCTIONALITY TOTAL: 88/100**

---

## PART 2: COMPLETENESS SCORE (0/100)

This measures "compared to the ideal system described in the knowledge instructions, how complete is the meetings ecosystem?"

| Area | Max | Score | Gap |
|------|-----|-------|-----|
| **Transcript → Candidate Profile** | 10 | 7 | `candidate_interview_recordings` table exists and is populated by analysis. `extract-candidate-performance` generates coaching suggestions, red/green flags, hiring recommendation. -3: No client UI on candidate profile showing interview history with playback links. |
| **Transcript → Job Dashboard** | 10 | 6 | `job_interview_recordings` table populated. -4: No UI on the job dashboard showing interview recordings per candidate. No aggregate "all interviews for this role" view. |
| **Transcript → Company Intelligence** | 10 | 7 | `bridge-meeting-to-intelligence` creates `company_interactions`, updates `intelligence_timeline`, creates `entity_relationships`. -3: Not automatically triggered — requires manual invocation. Company profile page doesn't surface meeting-derived intelligence. |
| **Transcript → Interviewer Coaching** | 5 | 3 | `extract-hiring-manager-patterns` analyzes interviewer behavior. `MeetingIntelligenceHub` shows question patterns with frequency. -2: No "interviewer coaching report" sent to interviewer. Patterns visible only in Intelligence Hub, not on interviewer's profile. |
| **Meeting → Club Pilot Tasks** | 8 | 6 | `bridge-meeting-to-pilot` creates `pilot_tasks` from action items. `analyze-meeting-recording-advanced` also creates `unified_tasks`. -2: Two separate task creation paths (pilot_tasks vs unified_tasks) — potential duplicates. No dedup logic. |
| **Meeting → Dossier Generation** | 8 | 7 | `GenerateDossierButton` on recording playback page. `generate-meeting-dossier` edge function exists. `generate-meeting-dossier-360` for comprehensive version. -1: Dossier doesn't auto-include interview recording link for client review. |
| **Meeting → CRM/Outreach** | 5 | 2 | `bridge-meeting-to-intelligence` creates company interaction. -3: No automatic CRM activity creation when a meeting with a prospect/client happens. No "meeting happened" event in CRM timeline. |
| **Scheduling → Pipeline Integration** | 8 | 6 | `ScheduleFromPipelineButton` allows scheduling from candidate pipeline. `CreateMeetingDialog` links to job_id and candidate_id. -2: No automatic pipeline stage advancement when interview meeting completes. |
| **Calendar Sync** | 8 | 4 | `google-calendar-auth`, `google-calendar-events`, `microsoft-calendar-auth`, `microsoft-calendar-events` edge functions exist. `refresh-calendar-tokens` for token rotation. `detect-calendar-interviews` scans for interview events. -4: No verified 2-way sync UI. Calendar connections page may exist but integration completeness unclear. |
| **External Meeting Import** | 8 | 6 | `sync-fathom-recordings`, `sync-fireflies-recordings` edge functions. Manual upload in `MeetingHistoryTab`. `JoinExternalMeetingDialog` + `ExternalCapturePreview` for screen capture of external calls. -2: Fathom/Fireflies require API keys that may not be configured. No Zoom/Teams webhook integration. |
| **GDPR & Data Lifecycle** | 5 | 3 | `gdpr-export` and `gdpr-delete` edge functions exist. Consent receipts in `RecordingConsentModal`. -2: No automatic recording deletion after retention period. No transcript redaction for PII. |
| **Notification & Alerts** | 5 | 3 | `send-meeting-summary-email` sends post-meeting email. `send-meeting-invitation-email` for invites. `MeetingNotificationManager` component exists. -2: No reminder notifications before meetings. No "recording ready" push notification. |
| **Meeting Templates** | 5 | 2 | `MeetingTemplateSelector` component exists. -3: Unclear if templates are backed by DB or hardcoded. No template management UI for admins. |
| **Breakout Rooms** | 5 | 3 | `BreakoutRoomsPanel`, `BreakoutRoomTimer`, `BreakoutRoomTransition`, `BreakoutRoomBroadcast` components exist. `useBreakoutRoomWebRTC` hook. -2: Complex WebRTC setup for breakout rooms likely has edge cases with re-negotiation. No automated return timer enforcement. |

**COMPLETENESS TOTAL: 65/100**

---

## PART 3: FEATURES WE DON'T HAVE BUT SHOULD (The 0.1% Ideas)

### Tier 1: High-Impact, Missing Entirely

1. **Interview Comparison Matrix** — A page exists at `/interview-comparison` (route exists) but needs: side-by-side comparison of multiple candidates interviewed for the same role. Pull data from `candidate_interview_recordings` + `job_interview_recordings`. Show scores radar chart, key quotes, recommendation alignment between interviewers.

2. **Automatic Pipeline Stage Advancement** — When a meeting ends and analysis completes with a `hiring_recommendation` of `strong_yes` or `yes`, automatically advance the candidate's application to the next pipeline stage (or flag for strategist review). This closes the loop between meetings and recruitment.

3. **Interviewer Calibration Report** — Use `hiring_manager_question_patterns` data to show interviewers how their scoring compares to outcomes (did candidates they rated highly actually get hired?). This builds institutional knowledge and reduces bias.

4. **Meeting Intelligence Digest (Daily Briefing)** — Every morning, strategists and admins get an AI-generated digest of yesterday's meetings: "3 interviews completed, 1 strong hire signal for [Role], 2 action items overdue, 1 candidate showed red flags around compensation." Wire into `generate-daily-briefing`.

5. **Candidate Meeting Portal** — Candidates should see their upcoming interviews, past meeting summaries (redacted to candidate-safe content), and any prep materials. Currently meetings are admin/strategist-only. The `InterviewPrepPanel` exists but only shows during live meetings.

6. **Smart Meeting Prep Auto-Push** — 30 minutes before an interview, automatically push a prep brief to the interviewer's notification/email. Currently `InterviewPrepPanel` only shows during the meeting. Should pre-generate via `generate-interview-prep` and deliver proactively.

### Tier 2: Differentiation Features

7. **Cross-Meeting Knowledge Graph** — `build-knowledge-graph` already extracts entities from transcripts. Surface this as a visual graph showing: "Candidate X mentioned Technology Y during Interview Z, which Company A also requires." Connect dots across multiple meetings.

8. **Offer Intelligence from Meeting Data** — When discussing compensation in an interview (detected by `salaryExpectations` in analysis), auto-populate offer builder with mentioned ranges. Flag mismatches with the job's comp band.

9. **Meeting-to-Training Pipeline** — Great interview answers (scored `strong` in `answer_quality`) should feed into a "best practices" library for candidate prep. "Here's how a successful candidate answered 'Tell me about a time you failed' for this company."

10. **Stakeholder Meeting Map** — Track all meetings with a company over time: who attended from their side, what was discussed, decision trajectory. Powered by `company_interactions` + `entity_relationships`. Display as a timeline with sentiment arc.

11. **Real-Time Interview Co-Pilot for Candidates** — `ClubAIBackchannelSuggestions` exists but only for interviewers. Offer candidates opt-in AI coaching during prep (not live interviews for ethical reasons) — practice mode with real-time feedback.

12. **Predictive No-Show Prevention** — `predict-no-show` edge function exists but needs wiring: when a candidate has a >60% no-show probability, auto-send a confirmation SMS 2 hours before and alert the strategist.

13. **Recording Chapters & Smart Navigation** — The `transcript_json` has timestamps. Auto-generate chapters (like YouTube chapters) from topic transitions detected by `analyze-meeting-recording-advanced`. Allow jumping to "Compensation Discussion" or "Technical Assessment" in playback.

### Tier 3: Polish & Delight

14. **Meeting Cost Calculator** — Calculate the cost of each meeting: (sum of estimated hourly rates × duration). Show on the meeting card. Flag meetings that "could have been an email" (already in `meeting_roi_metrics.could_have_been_email`).

15. **Interview Warmth Score** — Beyond functional scoring, measure how welcoming the interviewer was. Analyze transcript for rapport-building questions, positive affirmations, comfort checks. Surface in interviewer calibration.

16. **Multi-Language Interview Support** — `LiveTranslationPanel` component exists. Wire to `google-translate` edge function for real-time subtitle translation during cross-language interviews.

17. **Smart Scheduling Constraints** — When scheduling from pipeline, auto-check: candidate's timezone, interviewer's calendar, buffer time between interviews, the candidate's notice period deadline. `useSmartScheduling` hook exists.

---

## PART 4: IMPLEMENTATION PLAN

### Phase G: Data Integrity & Wiring (Current → +12 pts)

| # | Task | Impact |
|---|------|--------|
| 1 | Wire `bridge-meeting-to-intelligence` to auto-trigger after recording analysis completes (chain call in `analyze-meeting-recording-advanced`) | Company intelligence auto-populated |
| 2 | Add candidate interview history section to candidate profile page (query `candidate_interview_recordings`) | Strategists see full interview history |
| 3 | Add job interview recordings panel to job dashboard (query `job_interview_recordings`) | All interviews for a role in one view |
| 4 | Deduplicate task creation: remove `unified_tasks` insert from `analyze-meeting-recording-advanced`, let `bridge-meeting-to-pilot` be the single task path | No duplicate tasks |
| 5 | Switch `extract-candidate-performance` and `extract-hiring-manager-patterns` from `OPENAI_API_KEY` to Lovable AI (`google/gemini-2.5-flash`) | Reduce external API dependency |
| 6 | Wire `compile-meeting-transcript` to auto-run when meeting ends (set `is_final` on transcript segments from ElevenLabs/WebSpeech) | Transcripts actually compile |

### Phase H: Automation & Intelligence (→ +12 pts)

| # | Task | Impact |
|---|------|--------|
| 7 | Auto-trigger post-meeting follow-up generation when recording analysis completes | No manual "Generate Follow-up" click |
| 8 | Pre-meeting prep auto-push: schedule `generate-interview-prep` 30min before and send via email/notification | Interviewers arrive prepared |
| 9 | Wire `predict-no-show` to auto-send confirmation SMS 2h before if probability >60% | Reduce no-shows |
| 10 | Auto-advance pipeline stage when `hiring_recommendation` is `strong_yes` (with strategist override) | Close recruitment-meeting loop |
| 11 | Add recording chapters from AI topic transitions in `RecordingPlaybackPage` | Smart video navigation |
| 12 | Wire CRM activity creation when meeting involves a prospect/client | CRM timeline complete |

### Phase I: UI Completeness (→ +11 pts)

| # | Task | Impact |
|---|------|--------|
| 13 | Interview Comparison Matrix page (side-by-side candidate scoring for same role) | Better hiring decisions |
| 14 | Meeting cost calculator on meeting cards | ROI awareness |
| 15 | Stakeholder meeting timeline on company profile | Relationship intelligence |
| 16 | Date range filter on MeetingHistoryTab | Basic UX gap |
| 17 | Candidate meeting portal (upcoming interviews, redacted summaries, prep materials) | Candidate experience |
| 18 | SFU-mode cloud recording via LiveKit Egress | Recording parity |

---

## Summary Scores

| Dimension | Score |
|-----------|-------|
| **Functionality** (does it work?) | **88/100** |
| **Completeness** (is the ecosystem connected?) | **65/100** |
| **Combined** | **76/100** |

The meetings system has excellent depth in any single path (recording → analysis → AI summary is genuinely impressive with circuit breakers, retries, fallback models, and embedding generation). The gap is in **cross-system wiring**: meeting data reaches recording analysis but doesn't reliably flow back to candidate profiles, job dashboards, company intelligence, CRM, or the task engine without manual intervention. The 0.1% improvements above focus on closing these loops automatically.

