import re
import os
from collections import defaultdict

SCHEMA_FILE = "supabase/migrations/20260112180000_squashed_system_baseline.sql"
REPORT_FILE = "table_classification_report.md"

# Define known groupings for the "Unknown" bucket
PREFIX_MAPPINGS = {
    'ai_': 'Domain: AI & Intelligence',
    'agent_': 'Domain: AI Agents',
    'booking_': 'Domain: Bookings',
    'candidate_': 'Domain: Candidates',
    'company_': 'Domain: Companies',
    'crm_': 'Domain: CRM',
    'email_': 'Domain: Communication (Email)',
    'conversation_': 'Domain: Communication (Chat)',
    'message_': 'Domain: Communication (Chat)',
    'whatsapp_': 'Domain: Communication (WhatsApp)',
    'live_': 'Domain: Live Channels',
    'meeting_': 'Domain: Meetings',
    'ml_': 'Domain: Machine Learning',
    'module_': 'Domain: Learning Modules',
    'notification_': 'Domain: Notifications',
    'partner_': 'Domain: Partners',
    'payment_': 'Domain: Payments',
    'post_': 'Domain: Social (Posts)',
    'story_': 'Domain: Social (Stories)',
    'profile_': 'Domain: Profiles',
    'project_': 'Domain: Projects',
    'referral_': 'Domain: Referrals',
    'referral': 'Domain: Referrals', # Catch singular
    'report_': 'Domain: Analytics/Reporting',
    'analytics_': 'Domain: Analytics/Reporting',
    'user_': 'Domain: Users',
    'webhook_': 'Domain: Webhooks',
    'workspace_': 'Domain: Workspace',
    'kpi_': 'Domain: KPIs',
    'sla_': 'Domain: SLAs',
    'revenue_': 'Domain: Finance',
    'financial_': 'Domain: Finance',
    'invoice_': 'Domain: Finance',
    'achievement_': 'Domain: Gamification'
}

def classify_table(table_name):
    # Core Domain Logic - Strict List
    if table_name in ['users', 'profiles', 'applications', 'jobs', 'companies', 'payments']:
        return "Core: Essential"
    if any(x in table_name for x in ['auth_', 'permission', 'role']):
        return "Core: Auth & Permissions"
        
    # Support / Logs
    if any(x in table_name for x in ['_log', '_audit', '_history', 'event_']):
        return "Support: Logs & Audits"
        
    # Legacy / Temp
    if any(x in table_name for x in ['_old', '_backup', 'temp_', '2024', 'test', 'if']):
        return "Legacy: Deletion Candidates"
        
    # Heuristic Clustering for the rest
    for prefix, domain in PREFIX_MAPPINGS.items():
        if table_name.startswith(prefix):
            return domain
            
    # Default
    return "Unclassified (Potential Zombies)"

def generate_classification():
    if not os.path.exists(SCHEMA_FILE):
        print("Schema file not found!")
        return

    with open(SCHEMA_FILE, 'r') as f:
        content = f.read()

    tables = re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)", content, re.IGNORECASE)
    
    classification = defaultdict(list)

    for t in tables:
        category = classify_table(t)
        classification[category].append(t)

    # Generate Report
    with open(REPORT_FILE, 'w') as f:
        f.write("# Phase 2: Table Gravity Map\n\n")
        f.write(f"**Total Tables:** {len(tables)}\n")
        f.write("> This map groups tables by domain to identify consolidation targets.\n\n")
        
        # Sort keys to keep report stable, but put Unclassified last
        sorted_keys = sorted([k for k in classification.keys() if k != "Unclassified (Potential Zombies)"])
        if "Unclassified (Potential Zombies)" in classification:
            sorted_keys.append("Unclassified (Potential Zombies)")

        for cat in sorted_keys:
            items = classification[cat]
            f.write(f"## {cat} ({len(items)})\n")
            f.write("<details>\n<summary>View Tables</summary>\n\n")
            for t in sorted(items):
                f.write(f"- {t}\n")
            f.write("\n</details>\n\n")

if __name__ == "__main__":
    generate_classification()
