import re
import os
from collections import defaultdict

SCHEMA_FILE = "supabase/migrations/20260112180000_squashed_system_baseline.sql"
REPORT_FILE = "gravity_consolidation_plan.md"

# --------------------------
# 1. Classification Logic (Same as before)
# --------------------------
PREFIX_MAPPINGS = {
    'ai_': 'AI', 'agent_': 'AI', 'ml_': 'AI',
    'booking_': 'Bookings',
    'candidate_': 'Candidates',
    'company_': 'Companies',
    'crm_': 'CRM',
    'email_': 'Comms', 'conversation_': 'Comms', 'message_': 'Comms', 'whatsapp_': 'Comms', 'live_': 'Comms',
    'meeting_': 'Meetings',
    'notification_': 'Notifications',
    'partner_': 'Partners',
    'payment_': 'Finance', 'revenue_': 'Finance', 'financial_': 'Finance', 'invoice_': 'Finance',
    'post_': 'Social', 'story_': 'Social',
    'profile_': 'Profiles',
    'project_': 'Projects',
    'referral_': 'Referrals',
    'report_': 'Analytics', 'analytics_': 'Analytics',
    'user_': 'Users',
    'webhook_': 'Webhooks',
    'workspace_': 'Workspace',
    'achievement_': 'Gamification'
}

def get_domain(table_name):
    if table_name in ['users', 'profiles', 'applications', 'jobs', 'companies', 'payments']:
        return "Core"
    if any(x in table_name for x in ['auth_', 'permission', 'role']):
        return "Core-Auth"
    if any(x in table_name for x in ['_log', '_audit', '_history', 'event_']):
        return "Support-Logs"
    if any(x in table_name for x in ['_old', '_backup', 'temp_', '2024', 'test', 'if']):
        return "Legacy"
    
    for prefix, domain in PREFIX_MAPPINGS.items():
        if table_name.startswith(prefix):
            return domain
    return "Unknown"

# --------------------------
# 2. Optimized Gravity Scoring Logic
# --------------------------
def analyze_gravity():
    if not os.path.exists(SCHEMA_FILE):
        print(f"{SCHEMA_FILE} not found")
        return

    fk_counts = defaultdict(int) # Fan-In
    outbound_fks = defaultdict(int) # Fan-Out
    policy_counts = defaultdict(int) 
    tables = []
    
    current_table = None

    print("Starting optimized stream parse...")
    
    with open(SCHEMA_FILE, 'r') as f:
        for line in f:
            line = line.strip()
            
            # Simple string checks instead of regex where possible
            if line.startswith("CREATE TABLE"):
                # "CREATE TABLE public.foo (" or "CREATE TABLE foo ("
                match = re.search(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)", line, re.IGNORECASE)
                if match:
                    current_table = match.group(1)
                    tables.append(current_table)
            
            if current_table and "REFERENCES" in line.upper():
                # "user_id UUID REFERENCES public.users(id)"
                ref_match = re.search(r"REFERENCES\s+(?:public\.)?(\w+)", line, re.IGNORECASE)
                if ref_match:
                    target_table = ref_match.group(1)
                    outbound_fks[current_table] += 1
                    fk_counts[target_table] += 1
            
            if "CREATE POLICY" in line.upper():
                # CREATE POLICY "foo" ON public.bar
                pol_match = re.search(r"ON\s+(?:public\.)?(\w+)", line, re.IGNORECASE)
                if pol_match:
                    t_name = pol_match.group(1)
                    policy_counts[t_name] += 1

    print(f"Parsed {len(tables)} tables.")

    # --------------------------
    # 3. Calculate Scores
    # --------------------------
    table_scores = []
    
    for t in tables:
        domain = get_domain(t)
        fan_in = fk_counts[t]
        fan_out = outbound_fks[t]
        policies = policy_counts[t]
        
        # Base Score
        score = 0
        if domain == "Core": score += 50
        elif domain == "Core-Auth": score += 40
        elif domain in ["Users", "Companies", "Profiles", "Jobs"]: score += 30
        elif domain == "Support-Logs": score += 5
        elif domain == "Legacy": score -= 50
        elif domain == "Unknown": score -= 20
        else: score += 10
        
        score += (fan_in * 5)
        score += (fan_out * 1)
        if policies > 0: score += 5
        
        table_scores.append({
            "name": t,
            "domain": domain,
            "score": score,
            "fan_in": fan_in,
            "fan_out": fan_out,
            "policies": policies
        })

    table_scores.sort(key=lambda x: x['score'])
    
    # --------------------------
    # 4. Generate Report
    # --------------------------
    with open(REPORT_FILE, 'w') as f:
        f.write("# Phase 2: Gravity Consolidation Plan\n\n")
        f.write(f"**Total Tables:** {len(tables)}\n")
        
        # Extermination Zone
        kill_list = [t for t in table_scores if t['score'] < 0]
        # Remove empty string tables if any parsing error
        kill_list = [t for t in kill_list if t['name']]
        
        f.write(f"## ☠️ Extermination Zone ({len(kill_list)} tables)\n")
        f.write("| Table | Domain | Score | Why? |\n|---|---|---|---|\n")
        for t in kill_list:
            reason = []
            if t['domain'] == 'Legacy': reason.append("Legacy")
            if t['domain'] == 'Unknown': reason.append("Unknown")
            if t['fan_in'] == 0: reason.append("Orphan")
            f.write(f"| `{t['name']}` | {t['domain']} | {t['score']} | {', '.join(reason)} |\n")
        f.write("\n")
        
        # Consolidation Zone
        mid_list = [t for t in table_scores if 0 <= t['score'] < 20]
        f.write(f"## 📦 Consolidation Zone ({len(mid_list)} tables)\n")
        
        by_domain = defaultdict(list)
        for t in mid_list:
            by_domain[t['domain']].append(t['name'])
            
        for dom, t_list in sorted(by_domain.items()):
            if len(t_list) > 1:
                f.write(f"### {dom} ({len(t_list)})\n")
                f.write(f"- Candidates: {', '.join([f'`{n}`' for n in sorted(t_list)])}\n")
                f.write(f"- *Suggestion:* Merge into `{dom.lower()}_events`?\n\n")

        # High Gravity
        high_list = [t for t in table_scores if t['score'] >= 20]
        f.write(f"## 🪐 High Gravity Core ({len(high_list)} tables)\n")
        f.write("| Table | Domain | Fan-In | Score |\n|---|---|---|---|\n")
        for t in sorted(high_list, key=lambda x: x['score'], reverse=True)[:50]:
             f.write(f"| `{t['name']}` | {t['domain']} | {t['fan_in']} | {t['score']} |\n")

    print(f"Report generated: {REPORT_FILE}")

if __name__ == "__main__":
    analyze_gravity()
