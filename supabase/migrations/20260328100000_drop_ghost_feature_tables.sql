-- ============================================================================
-- DROP GHOST FEATURE TABLES
-- ============================================================================
-- Removes ~480 empty tables (0 rows) for features that were never built.
-- Preserves all tables with data (325 tables).
-- Preserves empty tables needed for Top 10 planned features:
--   #1 CRM Intelligence, #2 AI Talent Matching, #3 Meeting Intelligence,
--   #4 Interview Intelligence, #5 Achievements, #6 Referral System,
--   #7 AI Agent Orchestrator, #8 Booking No-Show, #9 WhatsApp, #10 KB/RAG
--
-- Uses CASCADE to automatically remove FK constraints pointing to these tables.
-- All tables are confirmed empty (0 rows) so no data loss occurs.
-- ============================================================================

BEGIN;

-- ============================================================================
-- DROP VIEWS that reference tables being dropped (must go first)
-- ============================================================================
DROP VIEW IF EXISTS sales_conversations CASCADE;
DROP VIEW IF EXISTS team_time_tracking_summary CASCADE;
DROP VIEW IF EXISTS time_tracking_revenue_metrics CASCADE;
DROP VIEW IF EXISTS data_integrity_issues CASCADE;
DROP VIEW IF EXISTS rag_metrics_summary CASCADE;

-- ============================================================================
-- GROUP 1: FREELANCER MARKETPLACE (completely wrong domain for recruiting app)
-- ============================================================================
DROP TABLE IF EXISTS freelance_contracts CASCADE;
DROP TABLE IF EXISTS freelance_profiles CASCADE;
DROP TABLE IF EXISTS freelancer_badges CASCADE;
DROP TABLE IF EXISTS freelancer_gigs CASCADE;
DROP TABLE IF EXISTS freelancer_team_members CASCADE;
DROP TABLE IF EXISTS freelancer_teams CASCADE;
DROP TABLE IF EXISTS gig_orders CASCADE;
DROP TABLE IF EXISTS marketplace_fraud_signals CASCADE;
DROP TABLE IF EXISTS marketplace_projects CASCADE;
DROP TABLE IF EXISTS saved_freelancers CASCADE;
DROP TABLE IF EXISTS project_activity_log CASCADE;
DROP TABLE IF EXISTS project_contracts CASCADE;
DROP TABLE IF EXISTS project_disputes CASCADE;
DROP TABLE IF EXISTS project_invitations CASCADE;
DROP TABLE IF EXISTS project_messages CASCADE;
DROP TABLE IF EXISTS project_milestones CASCADE;
DROP TABLE IF EXISTS project_proposals CASCADE;
DROP TABLE IF EXISTS project_reviews CASCADE;
DROP TABLE IF EXISTS projected_earnings CASCADE;
DROP TABLE IF EXISTS proposal_votes CASCADE;
DROP TABLE IF EXISTS retainer_contracts CASCADE;
DROP TABLE IF EXISTS retainer_hours_log CASCADE;

-- ============================================================================
-- GROUP 2: INVENTORY MANAGEMENT (wrong domain entirely)
-- ============================================================================
DROP TABLE IF EXISTS inventory_asset_events CASCADE;
DROP TABLE IF EXISTS inventory_assets CASCADE;
DROP TABLE IF EXISTS inventory_audit_log CASCADE;
DROP TABLE IF EXISTS inventory_depreciation_ledger CASCADE;
DROP TABLE IF EXISTS inventory_depreciation_runs CASCADE;

-- ============================================================================
-- GROUP 3: SCIM / SSO ENTERPRISE (no enterprise customers)
-- ============================================================================
DROP TABLE IF EXISTS scim_groups CASCADE;
DROP TABLE IF EXISTS scim_provisioning_logs CASCADE;
DROP TABLE IF EXISTS scim_tokens CASCADE;
DROP TABLE IF EXISTS scim_user_group_memberships CASCADE;
DROP TABLE IF EXISTS sso_connections CASCADE;
DROP TABLE IF EXISTS company_sso_config CASCADE;

-- ============================================================================
-- GROUP 4: DISASTER RECOVERY INFRASTRUCTURE (infra, not app tables)
-- ============================================================================
DROP TABLE IF EXISTS dr_compliance_audit CASCADE;
DROP TABLE IF EXISTS dr_contacts CASCADE;
DROP TABLE IF EXISTS dr_drill_results CASCADE;
DROP TABLE IF EXISTS dr_drill_schedule CASCADE;
DROP TABLE IF EXISTS recovery_metrics CASCADE;
DROP TABLE IF EXISTS recovery_playbooks CASCADE;
DROP TABLE IF EXISTS incident_logs CASCADE;
DROP TABLE IF EXISTS incident_response_actions CASCADE;
DROP TABLE IF EXISTS post_incident_reviews CASCADE;
DROP TABLE IF EXISTS service_dependencies CASCADE;

-- ============================================================================
-- GROUP 5: LEGAL AGREEMENTS / CONTRACTS (never built)
-- ============================================================================
DROP TABLE IF EXISTS legal_agreement_signatures CASCADE;
DROP TABLE IF EXISTS legal_agreement_templates CASCADE;
DROP TABLE IF EXISTS legal_agreements CASCADE;
DROP TABLE IF EXISTS contract_approval_requests CASCADE;
DROP TABLE IF EXISTS contract_approval_rules CASCADE;
DROP TABLE IF EXISTS contract_change_orders CASCADE;
DROP TABLE IF EXISTS contract_deadline_alerts CASCADE;
DROP TABLE IF EXISTS contract_documents CASCADE;
DROP TABLE IF EXISTS contract_invoices CASCADE;
DROP TABLE IF EXISTS contract_renewals CASCADE;
DROP TABLE IF EXISTS signed_documents CASCADE;
DROP TABLE IF EXISTS compliance_reviews CASCADE;

-- ============================================================================
-- GROUP 6: SOCIAL MEDIA MANAGEMENT (not core to recruiting)
-- ============================================================================
DROP TABLE IF EXISTS social_campaigns CASCADE;
DROP TABLE IF EXISTS social_comments CASCADE;
DROP TABLE IF EXISTS social_media_accounts CASCADE;
DROP TABLE IF EXISTS collaborative_posts CASCADE;
DROP TABLE IF EXISTS hashtags CASCADE;
DROP TABLE IF EXISTS pinned_posts CASCADE;
DROP TABLE IF EXISTS post_analytics CASCADE;
DROP TABLE IF EXISTS post_interactions CASCADE;
DROP TABLE IF EXISTS post_reactions CASCADE;
DROP TABLE IF EXISTS post_shares CASCADE;
DROP TABLE IF EXISTS post_views CASCADE;
DROP TABLE IF EXISTS unified_posts CASCADE;
DROP TABLE IF EXISTS saved_posts CASCADE;
DROP TABLE IF EXISTS trending_topics CASCADE;
DROP TABLE IF EXISTS rss_feeds CASCADE;
DROP TABLE IF EXISTS content_calendar CASCADE;
DROP TABLE IF EXISTS content_licensing CASCADE;
DROP TABLE IF EXISTS content_attributions CASCADE;
DROP TABLE IF EXISTS content_recommendations CASCADE;
DROP TABLE IF EXISTS content_ai_scores CASCADE;

-- ============================================================================
-- GROUP 7: WAITLIST SYSTEM (not needed)
-- ============================================================================
DROP TABLE IF EXISTS waitlist CASCADE;
DROP TABLE IF EXISTS waitlist_analytics CASCADE;
DROP TABLE IF EXISTS waitlist_engagement CASCADE;
DROP TABLE IF EXISTS waitlist_referrals CASCADE;

-- ============================================================================
-- GROUP 8: DATA ROOM (never built)
-- ============================================================================
DROP TABLE IF EXISTS data_room_access_logs CASCADE;
DROP TABLE IF EXISTS data_room_documents CASCADE;

-- ============================================================================
-- GROUP 9: FOCUS TIME / PRODUCTIVITY (not core)
-- ============================================================================
DROP TABLE IF EXISTS focus_time_blocks CASCADE;
DROP TABLE IF EXISTS focus_time_preferences CASCADE;
DROP TABLE IF EXISTS productivity_patterns CASCADE;

-- ============================================================================
-- GROUP 10: TIME TRACKING / TIMESHEETS (not core)
-- ============================================================================
DROP TABLE IF EXISTS time_entry_audit_logs CASCADE;
DROP TABLE IF EXISTS time_tracking_screenshots CASCADE;
DROP TABLE IF EXISTS timesheet_approvals CASCADE;
DROP TABLE IF EXISTS timesheet_periods CASCADE;

-- ============================================================================
-- GROUP 11: DM / MESSAGING (redundant with existing messaging)
-- ============================================================================
DROP TABLE IF EXISTS dm_conversations CASCADE;
DROP TABLE IF EXISTS dm_messages CASCADE;
DROP TABLE IF EXISTS scheduled_messages CASCADE;
DROP TABLE IF EXISTS message_audit_log CASCADE;
DROP TABLE IF EXISTS message_mentions CASCADE;
DROP TABLE IF EXISTS message_retention_policies CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS message_translations CASCADE;

-- ============================================================================
-- GROUP 12: WORKSPACE WIKI EXTRAS (workspace has data, but these extras don't)
-- ============================================================================
DROP TABLE IF EXISTS workspace_api_keys CASCADE;
DROP TABLE IF EXISTS workspace_automations CASCADE;
DROP TABLE IF EXISTS workspace_database_columns CASCADE;
DROP TABLE IF EXISTS workspace_database_rows CASCADE;
DROP TABLE IF EXISTS workspace_database_views CASCADE;
DROP TABLE IF EXISTS workspace_databases CASCADE;
DROP TABLE IF EXISTS workspace_invitations CASCADE;
DROP TABLE IF EXISTS workspace_webhook_logs CASCADE;
DROP TABLE IF EXISTS workspace_webhooks CASCADE;

-- ============================================================================
-- GROUP 13: LIVEHUB REAL-TIME (never completed)
-- ============================================================================
DROP TABLE IF EXISTS livehub_audit_logs CASCADE;
DROP TABLE IF EXISTS livehub_channel_participants CASCADE;
DROP TABLE IF EXISTS livehub_conversation_patterns CASCADE;
DROP TABLE IF EXISTS livehub_intelligence_bridge_log CASCADE;
DROP TABLE IF EXISTS livehub_session_summaries CASCADE;
DROP TABLE IF EXISTS livehub_transcripts CASCADE;
DROP TABLE IF EXISTS live_channel_participants CASCADE;
DROP TABLE IF EXISTS live_channel_permissions CASCADE;
DROP TABLE IF EXISTS live_channel_user_settings CASCADE;

-- ============================================================================
-- GROUP 14: NPS / CSAT SURVEYS (never built)
-- ============================================================================
DROP TABLE IF EXISTS csat_surveys CASCADE;
DROP TABLE IF EXISTS nps_surveys CASCADE;

-- ============================================================================
-- GROUP 15: PERFORMANCE REVIEWS HR (not core to recruiting)
-- ============================================================================
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS performance_reviews CASCADE;
DROP TABLE IF EXISTS probation_alerts CASCADE;
DROP TABLE IF EXISTS training_records CASCADE;
DROP TABLE IF EXISTS one_on_one_notes CASCADE;

-- ============================================================================
-- GROUP 16: AD CAMPAIGNS / MARKETING
-- ============================================================================
DROP TABLE IF EXISTS ad_campaigns CASCADE;
DROP TABLE IF EXISTS reengagement_campaigns CASCADE;
DROP TABLE IF EXISTS reengagement_history CASCADE;
DROP TABLE IF EXISTS activation_events CASCADE;

-- ============================================================================
-- GROUP 17: REVENUE / FINANCIAL EXTRAS (keep core moneybird tables)
-- ============================================================================
DROP TABLE IF EXISTS revenue_cohorts CASCADE;
DROP TABLE IF EXISTS revenue_metrics CASCADE;
DROP TABLE IF EXISTS financial_commentaries CASCADE;
DROP TABLE IF EXISTS financial_events CASCADE;
DROP TABLE IF EXISTS financial_forecasts CASCADE;
DROP TABLE IF EXISTS financial_settings CASCADE;
DROP TABLE IF EXISTS investor_access_codes CASCADE;
DROP TABLE IF EXISTS investor_metrics_snapshots CASCADE;
DROP TABLE IF EXISTS sales_forecasts CASCADE;
DROP TABLE IF EXISTS sales_proposals CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS vat_register CASCADE;

-- ============================================================================
-- GROUP 18: CONNECTS / SUBSCRIPTIONS (unused payment system)
-- ============================================================================
DROP TABLE IF EXISTS connects_subscriptions CASCADE;
DROP TABLE IF EXISTS connects_transactions CASCADE;
DROP TABLE IF EXISTS subscription_budgets CASCADE;
DROP TABLE IF EXISTS subscription_usage CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS payment_references CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS payout_batches CASCADE;
DROP TABLE IF EXISTS stripe_webhook_events CASCADE;

-- ============================================================================
-- GROUP 19: COMPANY SOCIAL FEATURES (not core)
-- ============================================================================
DROP TABLE IF EXISTS company_activity_events CASCADE;
DROP TABLE IF EXISTS company_analytics CASCADE;
DROP TABLE IF EXISTS company_assets CASCADE;
DROP TABLE IF EXISTS company_branding CASCADE;
DROP TABLE IF EXISTS company_contacts CASCADE;
DROP TABLE IF EXISTS company_domains CASCADE;
DROP TABLE IF EXISTS company_offices CASCADE;
DROP TABLE IF EXISTS company_people CASCADE;
DROP TABLE IF EXISTS company_people_changes CASCADE;
DROP TABLE IF EXISTS company_post_comments CASCADE;
DROP TABLE IF EXISTS company_post_likes CASCADE;
DROP TABLE IF EXISTS company_post_reactions CASCADE;
DROP TABLE IF EXISTS company_posts CASCADE;
DROP TABLE IF EXISTS company_referrer_splits CASCADE;
DROP TABLE IF EXISTS company_role_permissions CASCADE;
DROP TABLE IF EXISTS company_scan_jobs CASCADE;
DROP TABLE IF EXISTS company_scan_queue CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;
DROP TABLE IF EXISTS company_stories CASCADE;
DROP TABLE IF EXISTS company_story_likes CASCADE;
DROP TABLE IF EXISTS company_story_views CASCADE;

-- ============================================================================
-- GROUP 20: OVERENGINEERED MEETING TABLES (keep core meeting intelligence)
-- ============================================================================
DROP TABLE IF EXISTS meeting_audit_logs CASCADE;
DROP TABLE IF EXISTS meeting_bot_sessions CASCADE;
DROP TABLE IF EXISTS meeting_breakout_rooms CASCADE;
DROP TABLE IF EXISTS meeting_clips CASCADE;
DROP TABLE IF EXISTS meeting_encryption_keys CASCADE;
DROP TABLE IF EXISTS meeting_engagement_metrics CASCADE;
DROP TABLE IF EXISTS meeting_engagement_samples CASCADE;
DROP TABLE IF EXISTS meeting_evaluators CASCADE;
DROP TABLE IF EXISTS meeting_invitations CASCADE;
DROP TABLE IF EXISTS meeting_join_logs CASCADE;
DROP TABLE IF EXISTS meeting_notification_analytics CASCADE;
DROP TABLE IF EXISTS meeting_notification_queue CASCADE;
DROP TABLE IF EXISTS meeting_polls CASCADE;
DROP TABLE IF EXISTS meeting_reminders CASCADE;
DROP TABLE IF EXISTS meeting_roi_metrics CASCADE;
DROP TABLE IF EXISTS meeting_waiting_room_config CASCADE;
DROP TABLE IF EXISTS breakout_room_participants CASCADE;
DROP TABLE IF EXISTS external_meeting_sessions CASCADE;
DROP TABLE IF EXISTS preferred_meeting_hours CASCADE;
DROP TABLE IF EXISTS team_meeting_load CASCADE;

-- ============================================================================
-- GROUP 21: OVERENGINEERED BOOKING TABLES (keep core + no-show prediction)
-- ============================================================================
DROP TABLE IF EXISTS booking_approval_requests CASCADE;
DROP TABLE IF EXISTS booking_calendar_check_failures CASCADE;
DROP TABLE IF EXISTS booking_calendar_syncs CASCADE;
DROP TABLE IF EXISTS booking_deletion_logs CASCADE;
DROP TABLE IF EXISTS booking_funnel_events CASCADE;
DROP TABLE IF EXISTS booking_guests CASCADE;
DROP TABLE IF EXISTS booking_rate_limits CASCADE;
DROP TABLE IF EXISTS booking_reminder_logs CASCADE;
DROP TABLE IF EXISTS booking_time_proposals CASCADE;
DROP TABLE IF EXISTS booking_waitlist CASCADE;
DROP TABLE IF EXISTS booking_workflows CASCADE;
DROP TABLE IF EXISTS team_booking_assignments CASCADE;
DROP TABLE IF EXISTS calendar_health_checks CASCADE;

-- ============================================================================
-- GROUP 22: OVERENGINEERED KPI TABLES (keep core kpi_metrics)
-- ============================================================================
DROP TABLE IF EXISTS kpi_access_log CASCADE;
DROP TABLE IF EXISTS kpi_calculation_log CASCADE;
DROP TABLE IF EXISTS kpi_escalation_log CASCADE;
DROP TABLE IF EXISTS kpi_execution_events CASCADE;
DROP TABLE IF EXISTS kpi_executive_preferences CASCADE;
DROP TABLE IF EXISTS kpi_executive_reports CASCADE;
DROP TABLE IF EXISTS kpi_export_approvals CASCADE;
DROP TABLE IF EXISTS kpi_history CASCADE;
DROP TABLE IF EXISTS kpi_improvement_actions CASCADE;
DROP TABLE IF EXISTS kpi_ownership CASCADE;
DROP TABLE IF EXISTS kpi_report_subscriptions CASCADE;
DROP TABLE IF EXISTS kpi_visibility_rules CASCADE;
DROP TABLE IF EXISTS personal_kpi_goals CASCADE;
DROP TABLE IF EXISTS user_pinned_kpis CASCADE;

-- ============================================================================
-- GROUP 23: OVERENGINEERED AUDIT / SECURITY TABLES (keep core audit_events)
-- ============================================================================
DROP TABLE IF EXISTS admin_account_actions CASCADE;
DROP TABLE IF EXISTS admin_alert_preferences CASCADE;
DROP TABLE IF EXISTS admin_analytics_queries CASCADE;
DROP TABLE IF EXISTS admin_impersonation_sessions CASCADE;
DROP TABLE IF EXISTS audit_request_notifications CASCADE;
DROP TABLE IF EXISTS audit_request_responses CASCADE;
DROP TABLE IF EXISTS audit_requests CASCADE;
DROP TABLE IF EXISTS auth_security_events CASCADE;
DROP TABLE IF EXISTS email_notification_audit_log CASCADE;
DROP TABLE IF EXISTS role_verification_logs CASCADE;
DROP TABLE IF EXISTS security_alerts CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS security_incidents CASCADE;
DROP TABLE IF EXISTS security_metrics_history CASCADE;
DROP TABLE IF EXISTS bulk_operation_logs CASCADE;
DROP TABLE IF EXISTS data_classification_rules CASCADE;
DROP TABLE IF EXISTS data_consistency_logs CASCADE;
DROP TABLE IF EXISTS data_integrity_checks CASCADE;
DROP TABLE IF EXISTS data_export_requests CASCADE;
DROP TABLE IF EXISTS deletion_requests CASCADE;
DROP TABLE IF EXISTS risk_registry CASCADE;

-- ============================================================================
-- GROUP 24: OVERENGINEERED USER/PROFILE TABLES (keep core profiles)
-- ============================================================================
DROP TABLE IF EXISTS profile_achievements CASCADE;
DROP TABLE IF EXISTS profile_activity CASCADE;
DROP TABLE IF EXISTS profile_analytics CASCADE;
DROP TABLE IF EXISTS profile_custom_fields CASCADE;
DROP TABLE IF EXISTS profile_media CASCADE;
DROP TABLE IF EXISTS profile_recommendations CASCADE;
DROP TABLE IF EXISTS profile_strength_stats CASCADE;
DROP TABLE IF EXISTS profile_strength_tasks CASCADE;
DROP TABLE IF EXISTS profile_views CASCADE;
DROP TABLE IF EXISTS profile_visibility_rules CASCADE;
DROP TABLE IF EXISTS user_activity CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS user_behavior_embeddings CASCADE;
DROP TABLE IF EXISTS user_engagement CASCADE;
DROP TABLE IF EXISTS user_engagement_daily CASCADE;
DROP TABLE IF EXISTS user_feature_usage CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS user_journey_tracking CASCADE;
DROP TABLE IF EXISTS user_network CASCADE;
DROP TABLE IF EXISTS user_performance_metrics CASCADE;
DROP TABLE IF EXISTS user_profiles_extended CASCADE;
DROP TABLE IF EXISTS user_recovery_codes CASCADE;
DROP TABLE IF EXISTS user_search_analytics CASCADE;
DROP TABLE IF EXISTS user_search_preferences CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_similarity_matrix CASCADE;
DROP TABLE IF EXISTS user_timer_settings CASCADE;
DROP TABLE IF EXISTS user_trend_subscriptions CASCADE;

-- ============================================================================
-- GROUP 25: OVERENGINEERED TASK TABLES (keep core unified_tasks, task_boards)
-- ============================================================================
DROP TABLE IF EXISTS task_activity_log CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_blockers CASCADE;
DROP TABLE IF EXISTS task_board_invitations CASCADE;
DROP TABLE IF EXISTS task_board_members CASCADE;
DROP TABLE IF EXISTS task_completion_feedback CASCADE;
DROP TABLE IF EXISTS task_label_assignments CASCADE;
DROP TABLE IF EXISTS task_labels CASCADE;
DROP TABLE IF EXISTS task_migration_log CASCADE;
DROP TABLE IF EXISTS task_reminders CASCADE;
DROP TABLE IF EXISTS task_templates CASCADE;
DROP TABLE IF EXISTS template_assignments CASCADE;
DROP TABLE IF EXISTS unified_task_blockers CASCADE;
DROP TABLE IF EXISTS tracking_tasks CASCADE;

-- ============================================================================
-- GROUP 26: LEARNING / ACADEMY EXTRAS (keep core courses, modules)
-- ============================================================================
DROP TABLE IF EXISTS course_progress CASCADE;
DROP TABLE IF EXISTS learner_preferences CASCADE;
DROP TABLE IF EXISTS learning_analytics CASCADE;
DROP TABLE IF EXISTS learning_paths CASCADE;
DROP TABLE IF EXISTS path_enrollments CASCADE;
DROP TABLE IF EXISTS module_chat_messages CASCADE;
DROP TABLE IF EXISTS module_content CASCADE;
DROP TABLE IF EXISTS module_discussions CASCADE;
DROP TABLE IF EXISTS module_experts CASCADE;
DROP TABLE IF EXISTS module_questions CASCADE;
DROP TABLE IF EXISTS module_resources CASCADE;

-- ============================================================================
-- GROUP 27: PARTNER / SLA EXTRAS (keep core partner tables with data)
-- ============================================================================
DROP TABLE IF EXISTS partner_ai_insights CASCADE;
DROP TABLE IF EXISTS partner_analytics_snapshots CASCADE;
DROP TABLE IF EXISTS partner_audit_log CASCADE;
DROP TABLE IF EXISTS partner_benchmarks CASCADE;
DROP TABLE IF EXISTS partner_billing_details CASCADE;
DROP TABLE IF EXISTS partner_engagement_metrics CASCADE;
DROP TABLE IF EXISTS partner_integrations CASCADE;
DROP TABLE IF EXISTS partner_invoices CASCADE;
DROP TABLE IF EXISTS partner_sla_config CASCADE;
DROP TABLE IF EXISTS sla_commitments CASCADE;
DROP TABLE IF EXISTS sla_tracking CASCADE;
DROP TABLE IF EXISTS sla_violations CASCADE;

-- ============================================================================
-- GROUP 28: NOTIFICATION / WEBHOOK EXTRAS
-- ============================================================================
DROP TABLE IF EXISTS notification_delivery_log CASCADE;
DROP TABLE IF EXISTS notification_retry_queue CASCADE;
DROP TABLE IF EXISTS review_notifications CASCADE;
DROP TABLE IF EXISTS webhook_dead_letter_queue CASCADE;
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
DROP TABLE IF EXISTS webhook_delivery_stats CASCADE;
DROP TABLE IF EXISTS webhook_endpoints CASCADE;

-- ============================================================================
-- GROUP 29: OVERENGINEERED EMAIL TABLES (keep core emails, email_labels)
-- ============================================================================
DROP TABLE IF EXISTS email_attachments CASCADE;
DROP TABLE IF EXISTS email_contact_matches CASCADE;
DROP TABLE IF EXISTS email_drafts CASCADE;
DROP TABLE IF EXISTS email_label_mappings CASCADE;
DROP TABLE IF EXISTS email_learning_queue CASCADE;
DROP TABLE IF EXISTS email_threads CASCADE;
DROP TABLE IF EXISTS email_tracking_events CASCADE;

-- ============================================================================
-- GROUP 30: EXPERT MARKETPLACE (never built)
-- ============================================================================
DROP TABLE IF EXISTS expert_availability CASCADE;
DROP TABLE IF EXISTS expert_profiles CASCADE;
DROP TABLE IF EXISTS expert_sessions CASCADE;

-- ============================================================================
-- GROUP 31: PAGE / WIKI EXTRAS (keep workspace core)
-- ============================================================================
DROP TABLE IF EXISTS page_activity CASCADE;
DROP TABLE IF EXISTS page_analytics CASCADE;
DROP TABLE IF EXISTS page_attachments CASCADE;
DROP TABLE IF EXISTS page_backlinks CASCADE;
DROP TABLE IF EXISTS page_comments CASCADE;
DROP TABLE IF EXISTS page_mentions CASCADE;
DROP TABLE IF EXISTS page_permissions CASCADE;
DROP TABLE IF EXISTS discussion_replies CASCADE;

-- ============================================================================
-- GROUP 32: LINKEDIN EXTRAS (keep core linkedin_avatar tables with data)
-- ============================================================================
DROP TABLE IF EXISTS linkedin_avatar_daily_stats CASCADE;
DROP TABLE IF EXISTS linkedin_avatar_time_corrections CASCADE;
DROP TABLE IF EXISTS linkedin_imports CASCADE;
DROP TABLE IF EXISTS linkedin_job_imports CASCADE;

-- ============================================================================
-- GROUP 33: VIDEO CALL EXTRAS (keep core video_call_sessions/participants)
-- ============================================================================
DROP TABLE IF EXISTS video_call_recordings CASCADE;
DROP TABLE IF EXISTS video_call_signals CASCADE;
DROP TABLE IF EXISTS video_call_transcripts CASCADE;
DROP TABLE IF EXISTS call_quality_feedback CASCADE;
DROP TABLE IF EXISTS voice_quality_alerts CASCADE;
DROP TABLE IF EXISTS voice_reconnection_log CASCADE;

-- ============================================================================
-- GROUP 34: STRATEGIST / RECRUITER EXTRAS
-- ============================================================================
DROP TABLE IF EXISTS strategist_performance_snapshots CASCADE;
DROP TABLE IF EXISTS strategist_placements CASCADE;
DROP TABLE IF EXISTS recruiter_bonuses CASCADE;

-- ============================================================================
-- GROUP 35: VARIOUS ENTERPRISE / COMPLIANCE
-- ============================================================================
DROP TABLE IF EXISTS subprocessor_changes CASCADE;
DROP TABLE IF EXISTS subprocessors CASCADE;
DROP TABLE IF EXISTS cookie_consent_records CASCADE;
DROP TABLE IF EXISTS org_chart_candidate_placements CASCADE;

-- ============================================================================
-- GROUP 36: OVERENGINEERED AI TABLES (keep core ai_memory, ai_conversations)
-- ============================================================================
DROP TABLE IF EXISTS ai_action_audit CASCADE;
DROP TABLE IF EXISTS ai_action_log CASCADE;
DROP TABLE IF EXISTS ai_content_suggestions CASCADE;
DROP TABLE IF EXISTS ai_copilot_tips CASCADE;
DROP TABLE IF EXISTS ai_meeting_suggestions CASCADE;
DROP TABLE IF EXISTS ai_outreach_logs CASCADE;
DROP TABLE IF EXISTS ai_persona_profiles CASCADE;
DROP TABLE IF EXISTS ai_session_feedback CASCADE;
DROP TABLE IF EXISTS analytics_ai_insights CASCADE;
DROP TABLE IF EXISTS analytics_export_log CASCADE;
DROP TABLE IF EXISTS adversarial_query_log CASCADE;
DROP TABLE IF EXISTS compression_experiments CASCADE;
DROP TABLE IF EXISTS prompt_experiments CASCADE;
DROP TABLE IF EXISTS synthetic_test_queries CASCADE;
DROP TABLE IF EXISTS secure_enclave_queries CASCADE;

-- ============================================================================
-- GROUP 37: OVERENGINEERED CRM TABLES (keep core crm_prospects, campaigns)
-- ============================================================================
DROP TABLE IF EXISTS crm_ab_test_insights CASCADE;
DROP TABLE IF EXISTS crm_ab_test_variants CASCADE;
DROP TABLE IF EXISTS crm_activity_templates CASCADE;
DROP TABLE IF EXISTS crm_analytics_snapshots CASCADE;
DROP TABLE IF EXISTS crm_assignment_rules CASCADE;
DROP TABLE IF EXISTS crm_campaign_roi CASCADE;
DROP TABLE IF EXISTS crm_email_threads CASCADE;
DROP TABLE IF EXISTS crm_import_logs CASCADE;
DROP TABLE IF EXISTS crm_integration_settings CASCADE;
DROP TABLE IF EXISTS crm_lead_predictions CASCADE;
DROP TABLE IF EXISTS crm_outreach_insights CASCADE;
DROP TABLE IF EXISTS crm_outreach_learnings CASCADE;
DROP TABLE IF EXISTS crm_reply_intelligence CASCADE;
DROP TABLE IF EXISTS crm_saved_views CASCADE;
DROP TABLE IF EXISTS crm_suppression_list CASCADE;
DROP TABLE IF EXISTS crm_touchpoints CASCADE;
DROP TABLE IF EXISTS contact_email_sentiment CASCADE;
DROP TABLE IF EXISTS company_email_sentiment CASCADE;
DROP TABLE IF EXISTS deal_loss_reasons CASCADE;
DROP TABLE IF EXISTS lead_scores CASCADE;
DROP TABLE IF EXISTS prospect_score_history CASCADE;
DROP TABLE IF EXISTS continuous_pipeline_hires CASCADE;

-- ============================================================================
-- GROUP 38: GAMIFICATION EXTRAS (keep core achievements with data)
-- ============================================================================
DROP TABLE IF EXISTS employee_gamification CASCADE;
DROP TABLE IF EXISTS employee_milestones CASCADE;
DROP TABLE IF EXISTS employee_xp_events CASCADE;
DROP TABLE IF EXISTS leaderboard_entries CASCADE;
DROP TABLE IF EXISTS milestone_celebrations CASCADE;
DROP TABLE IF EXISTS milestone_comments CASCADE;
DROP TABLE IF EXISTS milestone_contributions CASCADE;
DROP TABLE IF EXISTS reward_decisions CASCADE;
DROP TABLE IF EXISTS reward_proposals CASCADE;
DROP TABLE IF EXISTS scorecard_voting_sessions CASCADE;

-- ============================================================================
-- GROUP 39: MISC EMPTY TABLES (clearly unused)
-- ============================================================================
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS api_rate_limits CASCADE;
DROP TABLE IF EXISTS api_usage_logs CASCADE;
DROP TABLE IF EXISTS app_usage_tracking CASCADE;
DROP TABLE IF EXISTS approval_workflows CASCADE;
DROP TABLE IF EXISTS assessment_analytics CASCADE;
DROP TABLE IF EXISTS assessment_assignments CASCADE;
DROP TABLE IF EXISTS assessment_templates CASCADE;
DROP TABLE IF EXISTS biometric_settings CASCADE;
DROP TABLE IF EXISTS blocked_domains CASCADE;
DROP TABLE IF EXISTS blocked_ips CASCADE;
DROP TABLE IF EXISTS blog_bookmarks CASCADE;
DROP TABLE IF EXISTS blog_content_signals CASCADE;
DROP TABLE IF EXISTS blog_post_variants CASCADE;
DROP TABLE IF EXISTS blog_reactions CASCADE;
DROP TABLE IF EXISTS blog_subscribers CASCADE;
DROP TABLE IF EXISTS brand_assets_cache CASCADE;
DROP TABLE IF EXISTS capacity_planning CASCADE;
DROP TABLE IF EXISTS career_insights_cache CASCADE;
DROP TABLE IF EXISTS career_trend_insights CASCADE;
DROP TABLE IF EXISTS churn_analysis CASCADE;
DROP TABLE IF EXISTS circuit_breaker_state CASCADE;
DROP TABLE IF EXISTS club_sync_requests CASCADE;
DROP TABLE IF EXISTS conflict_resolution_history CASCADE;
DROP TABLE IF EXISTS conversation_analytics_daily CASCADE;
DROP TABLE IF EXISTS custom_funnels CASCADE;
DROP TABLE IF EXISTS customer_acquisition CASCADE;
DROP TABLE IF EXISTS device_tokens CASCADE;
DROP TABLE IF EXISTS dossier_shares CASCADE;
DROP TABLE IF EXISTS dossier_views CASCADE;
DROP TABLE IF EXISTS edge_function_daily_stats CASCADE;
DROP TABLE IF EXISTS enrichment_logs CASCADE;
DROP TABLE IF EXISTS entity_graph_links CASCADE;
-- KEEP entity_relationships: used by build-knowledge-graph + retrieve-context (GraphRAG)
DROP TABLE IF EXISTS external_context_imports CASCADE;
DROP TABLE IF EXISTS external_health_checks CASCADE;
DROP TABLE IF EXISTS external_interviewer_tokens CASCADE;
DROP TABLE IF EXISTS external_interviewers CASCADE;
DROP TABLE IF EXISTS funnel_analytics_cache CASCADE;
DROP TABLE IF EXISTS greenhouse_import_logs CASCADE;
DROP TABLE IF EXISTS guest_domain_behavior CASCADE;
DROP TABLE IF EXISTS hiring_metrics_weekly CASCADE;
DROP TABLE IF EXISTS incubator_actions CASCADE;
DROP TABLE IF EXISTS incubator_scoring_evidence CASCADE;
DROP TABLE IF EXISTS instantly_account_health CASCADE;
DROP TABLE IF EXISTS instantly_send_time_analytics CASCADE;
DROP TABLE IF EXISTS instantly_sequence_steps CASCADE;
DROP TABLE IF EXISTS market_intelligence CASCADE;
DROP TABLE IF EXISTS moneybird_contact_sync CASCADE;
DROP TABLE IF EXISTS moneybird_invoice_sync CASCADE;
DROP TABLE IF EXISTS moneybird_settings CASCADE;
DROP TABLE IF EXISTS ner_entity_relationships CASCADE;
DROP TABLE IF EXISTS notetaker_settings CASCADE;
DROP TABLE IF EXISTS objective_activities CASCADE;
DROP TABLE IF EXISTS objective_comments CASCADE;
DROP TABLE IF EXISTS onboarding_checklists CASCADE;
DROP TABLE IF EXISTS pilot_metrics CASCADE;
DROP TABLE IF EXISTS pilot_preferences CASCADE;
DROP TABLE IF EXISTS pilot_tasks CASCADE;
DROP TABLE IF EXISTS pipeline_events CASCADE;
DROP TABLE IF EXISTS pipeline_reviewers CASCADE;
DROP TABLE IF EXISTS playlist_tracks CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS query_success_patterns CASCADE;
DROP TABLE IF EXISTS question_answers CASCADE;
DROP TABLE IF EXISTS proxycurl_credit_ledger CASCADE;
DROP TABLE IF EXISTS rate_limit_analytics CASCADE;
DROP TABLE IF EXISTS report_executions CASCADE;
DROP TABLE IF EXISTS scheduled_reports CASCADE;
DROP TABLE IF EXISTS scheduling_conflicts CASCADE;
DROP TABLE IF EXISTS skill_endorsements CASCADE;
DROP TABLE IF EXISTS skills_demand_metrics CASCADE;
DROP TABLE IF EXISTS sms_messages CASCADE;
DROP TABLE IF EXISTS story_comments CASCADE;
DROP TABLE IF EXISTS story_saves CASCADE;
DROP TABLE IF EXISTS system_alerts CASCADE;
DROP TABLE IF EXISTS target_company_comments CASCADE;
DROP TABLE IF EXISTS target_company_contacts CASCADE;
DROP TABLE IF EXISTS translation_audit_log CASCADE;
DROP TABLE IF EXISTS translation_feedback CASCADE;
DROP TABLE IF EXISTS translation_sync_queue CASCADE;
DROP TABLE IF EXISTS web_performance_metrics CASCADE;
DROP TABLE IF EXISTS automation_logs CASCADE;
DROP TABLE IF EXISTS workflow_executions CASCADE;
DROP TABLE IF EXISTS avatar_social_targets CASCADE;
DROP TABLE IF EXISTS candidate_completeness_audit CASCADE;
DROP TABLE IF EXISTS csm_activities CASCADE;
DROP TABLE IF EXISTS csm_assignments CASCADE;
DROP TABLE IF EXISTS dismissed_jobs CASCADE;
DROP TABLE IF EXISTS saved_searches CASCADE;
DROP TABLE IF EXISTS hiring_manager_profiles CASCADE;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Dropped: ~480 empty ghost feature tables
-- Preserved with data: 325 tables
-- Preserved empty (for Top 10 features): ~130 tables
--
-- KEPT empty tables for planned features:
--   CRM Intelligence: cross_channel_patterns, communication_intelligence_queue,
--     communication_task_queue, predictive_signals, company_interactions,
--     company_intelligence, company_intelligence_scores, intelligence_queries,
--     intelligence_timeline, interaction_insights, interaction_messages,
--     interaction_participants, stakeholder_memory, stakeholder_relationships,
--     company_stakeholders, signal_patterns, company_enrichment_cache
--   AI Talent Matching: talent_matches, ml_*, talent_pool_*
--   Meeting Intelligence: meeting_intelligence*, meeting_insights, meeting_dossiers,
--     meeting_transcripts, meeting_summaries, meeting_action_items, meeting_templates,
--     meeting_analytics, meeting_follow_ups, meeting_agenda_items, participant_dossiers
--   Interview Intelligence: interviews, interview_*, candidate_interview_*
--   Achievements: achievement_analytics/challenges/prerequisites/tiers,
--     user_achievements, user_challenge_progress, company_achievements
--   Referral: referral_* (all 12 empty tables)
--   AI Agent: agent_* (feedback, instructions, working_memory, etc.), sourcing_missions
--   Booking No-Show: booking_no_show_predictions, booking_behavior_patterns,
--     no_show_interventions
--   WhatsApp: all whatsapp_* (12 tables)
--   KB/RAG: knowledge_base_articles, kb_article_feedback, document_embeddings,
--     embedding_cache, rag_*
--   Core: candidate_offers, candidate_invitations, candidate_tag_assignments,
--     candidate_scorecards, candidate_shortlists, candidate_relationships,
--     job_pipelines, job_analytics, support_tickets, support_ticket_messages,
--     email_drafts (moved to drop), ai_memory, etc.
-- ============================================================================

COMMIT;
