

# Full Audit: Give Club AI Complete System Knowledge

## Current State

The database has **895 tables**. The admin context in `club-ai-chat` currently queries approximately **40 tables** in the admin/strategist block and ~30 in the common user block. Many business-critical tables that an admin would ask about are completely absent.

## What IS Currently Queried

**Common (all users):** profiles, user_roles, company_members, companies, applications, unified_tasks, club_objectives, bookings, booking_links, jobs, profile_strength_stats, posts, stories, social_connections, comments, user_quantum_achievements, company_achievement_earners, conversation_participants, referral_network, user_engagement, company_followers, saved_jobs, meeting_recordings, closed_pipelines, ai_conversations, whatsapp_messages, whatsapp_conversations, sms_messages, company_interactions, communication_relationship_scores, unified_communications, external_context_imports, emails, meetings, ai_memory, career_trend_insights, user_trend_subscriptions, predictive_signals, success_patterns

**Admin block:** placement_fees, moneybird_sales_invoices, moneybird_financial_metrics, partner_invoices, payment_transactions, crm_prospects, referral_payouts, candidate_profiles, kpi_metrics, jobs (enriched), applications (enriched), profiles (count), candidate_offers, candidate_shortlists, candidate_scorecards, interview_feedback, candidate_interactions, candidate_notes, dossier_shares, meeting_dossiers, strategist_assignments, capacity_planning, churn_analysis, sla_tracking, nps_surveys

**Partner block:** jobs (company-scoped), placement_fees (company-scoped), partner_invoices (company-scoped), company_members, kpi_metrics (company-scoped), candidate_offers, candidate_shortlists, interview_feedback, applications (company-scoped)

## What IS MISSING (Business-Critical Gaps)

### Category 1: Revenue and Financial Intelligence
These tables contain data admins frequently ask about.

| Table | Why It Matters |
|---|---|
| `revenue_metrics` | Platform revenue KPIs, MRR, ARR |
| `revenue_milestones` | Revenue goals and progress |
| `revenue_cohorts` | Revenue by cohort analysis |
| `revenue_ladders` | Revenue progression tiers |
| `cash_flow_pipeline` | Cash flow forecasting |
| `employee_commissions` | Strategist commission tracking |
| `employee_earnings_summary` | Earnings per strategist |
| `employee_pipeline_value` | Value each strategist manages |
| `commission_tiers` | Commission structure |
| `contract_invoices` | Contract-based invoicing |
| `invoice_line_items` | Invoice detail breakdowns |
| `invoices` | General invoicing |
| `payment_references` | Payment reference tracking |

### Category 2: Employee / Strategist Performance
Admins ask "how is the team performing?"

| Table | Why It Matters |
|---|---|
| `employee_profiles` | Strategist profiles, roles, targets |
| `employee_targets` | Individual performance targets |
| `employee_milestones` | Career/performance milestones |
| `employee_gamification` | Gamification engagement |
| `employee_xp_events` | Experience point events |
| `leaderboard_entries` | Team leaderboard rankings |

### Category 3: Pipeline and Conversion
Admins ask "where are we losing candidates?"

| Table | Why It Matters |
|---|---|
| `pipeline_events` | Pipeline stage transitions |
| `pipeline_conversion_metrics` | Stage-to-stage conversion rates |
| `pipeline_feedback` | Feedback on pipeline stages |
| `pipeline_audit_logs` | Pipeline change history |
| `interview_pipeline_metrics` | Interview-specific conversion |
| `continuous_pipeline_hires` | Continuous hiring tracking |
| `job_pipelines` | Job-specific pipeline configs |
| `closed_pipelines` | Completed/lost pipelines |
| `candidate_interview_performance` | Interview performance data |
| `candidate_activity_metrics` | Candidate engagement metrics |
| `candidate_profile_views` | Who viewed which profiles |
| `candidate_company_history` | Work history records |
| `candidate_relationships` | Candidate-to-candidate links |

### Category 4: CRM and Outreach
Admins ask "how is our outreach performing?"

| Table | Why It Matters |
|---|---|
| `crm_activities` | CRM activity log |
| `crm_campaigns` | Campaign tracking |
| `crm_campaign_roi` | Campaign ROI data |
| `crm_lead_predictions` | Lead scoring predictions |
| `crm_email_threads` | Email thread tracking |
| `crm_email_replies` | Reply tracking |
| `ai_outreach_logs` | AI-generated outreach |
| `crm_analytics_snapshots` | CRM analytics snapshots |

### Category 5: Partner Funnel and Client Management
Admins ask "how are partner conversions?"

| Table | Why It Matters |
|---|---|
| `partner_funnel_submissions` (if exists) | Partner sign-up funnel |
| `activation_events` | Partner activation tracking |
| `company_analytics` | Per-company analytics |
| `company_candidate_feedback` | Client feedback on candidates |
| `company_strategist_assignments` | Who manages which client |
| `company_intelligence` | Company research/intel |
| `company_intelligence_scores` | Company scoring |
| `company_stakeholders` | Key stakeholders per company |

### Category 6: Club Sync and Automated Matching
Admins ask "how is Club Sync performing?"

| Table | Why It Matters |
|---|---|
| `club_sync_requests` | Auto-apply requests and status |

### Category 7: Referrals (full picture)
Current context has referral_payouts but misses structure.

| Table | Why It Matters |
|---|---|
| `referral_tiers` | Referral reward tiers |
| `referral_revenue_shares` | Revenue share tracking |
| `referral_leaderboard_cache` | Top referrers |

### Category 8: Assessments and Skills
Admins ask "how are assessments going?"

| Table | Why It Matters |
|---|---|
| `assessment_results` | Assessment scores/outcomes |
| `assessment_assignments` | Who's assigned what assessment |
| `assessment_analytics` | Assessment performance data |
| `profile_skills` | Candidate skills |
| `skills_demand_metrics` | Which skills are in demand |
| `skills_taxonomy` | Skills hierarchy |
| `skill_endorsements` | Skill endorsements |

### Category 9: Platform Health and Operations
Admins ask "how is the platform doing?"

| Table | Why It Matters |
|---|---|
| `error_logs` | Application errors |
| `performance_metrics` | App performance data |
| `feature_flags` | Which features are enabled |
| `security_alerts` | Security issues |
| `security_incidents` | Security incident log |
| `compliance_reviews` | Compliance status |
| `data_export_requests` | GDPR export requests |
| `consent_receipts` | Consent tracking |
| `approval_workflows` | Pending approvals |
| `automation_logs` | Automation run history |

### Category 10: Content and Community
Admins ask "how is the community?"

| Table | Why It Matters |
|---|---|
| `user_feedback` | User feedback submissions |
| `csat_surveys` | CSAT survey responses |
| `academies` | Academy/learning content |
| `courses` | Available courses |
| `course_progress` | Learning progress |
| `marketplace_projects` | Marketplace activity |
| `content_calendar` | Content planning |

### Category 11: Booking and Scheduling Analytics
Admins ask "how is scheduling?"

| Table | Why It Matters |
|---|---|
| `booking_analytics` | Booking performance metrics |
| `booking_funnel_analytics` | Booking conversion funnels |
| `booking_waitlist` | Waitlist data |
| `booking_no_show_predictions` | No-show risk |

## Implementation Approach

### Important: Context Window Limits

We cannot dump all 895 tables into the prompt. Instead, we add the **top 30-35 most business-critical missing tables** with summary-level queries (counts, aggregations, recent items) to keep token usage manageable.

### Changes to `supabase/functions/club-ai-chat/index.ts`

**Step 1: Add ~30 new queries to the admin Promise.all block**

Each query fetches summary data (counts, recent records, aggregations) -- not full table dumps. Group into 3 additional Promise.all blocks to keep code readable:

```text
// Block A: Revenue, Commissions, Pipeline Conversion
- revenue_metrics (limit 10, most recent)
- cash_flow_pipeline (all, small table)
- employee_commissions (limit 30, recent)
- employee_profiles (all active)
- employee_targets (all active)
- commission_tiers (all)
- pipeline_conversion_metrics (all, small table)
- pipeline_events (limit 50, recent)
- continuous_pipeline_hires (limit 20, recent)
- candidate_interview_performance (limit 30, recent)
- candidate_activity_metrics (limit 30, recent)
- candidate_profile_views (limit 30, recent)

// Block B: CRM, Outreach, Partner Intelligence
- crm_activities (limit 30, recent)
- crm_campaigns (limit 20, recent)
- crm_campaign_roi (limit 10)
- crm_lead_predictions (limit 20, high confidence)
- ai_outreach_logs (limit 20, recent)
- activation_events (limit 20, recent)
- company_analytics (limit 20, recent)
- company_candidate_feedback (limit 20, recent)
- company_intelligence_scores (limit 20)
- club_sync_requests (limit 30, recent)
- referral_tiers (all)
- referral_revenue_shares (limit 20, recent)

// Block C: Assessments, Platform Health, Community
- assessment_results (limit 30, recent)
- assessment_analytics (limit 10)
- skills_demand_metrics (limit 20)
- error_logs (limit 20, recent critical/error only)
- feature_flags (all active)
- approval_workflows (limit 10, pending)
- user_feedback (limit 15, recent)
- csat_surveys (limit 15, recent)
- booking_analytics (limit 10, recent)
- data_export_requests (limit 10, recent)
- security_incidents (limit 10, recent)
```

**Step 2: Format each block into new context sections**

Add these context sections after the existing admin sections:

```text
=== ADMIN: REVENUE INTELLIGENCE ===
(Revenue metrics, cash flow pipeline, milestones)

=== ADMIN: STRATEGIST PERFORMANCE ===
(Employee profiles, targets, commissions, pipeline value)

=== ADMIN: PIPELINE CONVERSION ===
(Stage-to-stage conversion rates, pipeline events, interview performance)

=== ADMIN: CRM & OUTREACH ===
(CRM activities, campaigns with ROI, lead predictions, outreach logs)

=== ADMIN: PARTNER ACQUISITION ===
(Activation events, company analytics, client intelligence scores)

=== ADMIN: CLUB SYNC ===
(Recent sync requests, statuses, success rates)

=== ADMIN: REFERRAL PROGRAM ===
(Tiers, revenue shares, top referrers)

=== ADMIN: ASSESSMENTS & SKILLS ===
(Assessment results, analytics, skills in demand)

=== ADMIN: PLATFORM HEALTH ===
(Recent errors, feature flags, pending approvals, security incidents)

=== ADMIN: CLIENT SATISFACTION ===
(User feedback, CSAT surveys -- complementing existing NPS)

=== ADMIN: SCHEDULING INTELLIGENCE ===
(Booking analytics, no-show rates, waitlist)

=== ADMIN: COMPLIANCE & DATA ===
(GDPR export requests, consent status)
```

**Step 3: Update system prompt (line 1496)**

Expand the admin data access description to include all new categories so Club AI knows it can reference them.

**Step 4: Enrich partner context with relevant subset**

Add company-scoped versions of: company_analytics, company_candidate_feedback, assessment_results (for company jobs), booking_analytics (for company bookings).

### Changes to `supabase/functions/_shared/ai-tools.ts`

No new tools needed. The existing tools plus the enriched context will allow Club AI to answer virtually any admin question.

## Files Modified

| File | Changes |
|---|---|
| `supabase/functions/club-ai-chat/index.ts` | Add ~30 new queries in 3 additional Promise.all blocks, add 12 new context sections, update system prompt |

## Technical Notes

- All queries use the service role key (RLS bypassed), which is correct for admin context
- Each query is limited to 10-30 rows to keep context tokens manageable
- The 3 additional Promise.all blocks run after the existing one completes (they depend on the role check)
- Estimated additional latency: 100-200ms (queries run in parallel within each block)
- No database changes needed -- all tables already exist
- Total context increase: roughly 3,000-5,000 tokens for a typical admin session, well within model limits

## What We Intentionally Skip

The remaining ~800 tables are system/infrastructure tables (agent internals, AI session logs, appearance presets, workspace internals, booking rate limits, etc.) that admins would never ask about. If a specific need arises, individual tables can be added later. The 70+ tables covered after this change represent all business-critical data.

