# Testing ML Intelligence Functions

## Overview
Three new AI-powered edge functions have been created to extract intelligence from company interactions using Lovable AI (Gemini 2.5 Flash).

## Edge Functions Created

### 1. `extract-interaction-insights`
**Purpose:** Analyzes interaction content to extract structured insights.

**Input:**
```json
{
  "interaction_id": "uuid-of-interaction"
}
```

**What it extracts:**
- Hiring urgency score (0-10)
- Budget signals and compensation mentions
- Timeline and deadline mentions
- Pain points being solved
- Decision stage (exploration/active/final)
- Stakeholder sentiment per participant
- Red flags and positive signals
- Actionable next steps
- Key quotes

**How to test:**
```bash
# Using curl (replace with actual interaction ID)
curl -X POST \
  'https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/extract-interaction-insights' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"interaction_id": "actual-interaction-id-here"}'
```

### 2. `calculate-stakeholder-influence`
**Purpose:** Calculates influence scores and maps decision-making hierarchy.

**Input:**
```json
{
  "company_id": "uuid-of-company"
}
```

**What it calculates:**
- Initiation Score (who starts conversations)
- Response Score (who responds first)
- Mention Score (who gets CC'd/mentioned)
- Meeting Leadership (who speaks most)
- Engagement Score (interaction frequency)
- Role classification (Decision Maker, Influencer, Gatekeeper, Champion, Blocker)

**How to test:**
```bash
curl -X POST \
  'https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/calculate-stakeholder-influence' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"company_id": "actual-company-id-here"}'
```

### 3. `generate-company-intelligence-report`
**Purpose:** Creates comprehensive intelligence summary for a company.

**Input:**
```json
{
  "company_id": "uuid-of-company"
}
```

**Report includes:**
- Interaction summary (volume, types, frequency)
- Stakeholder map with engagement scores
- Hiring intelligence (urgency, budget, timeline)
- Cultural insights (communication style, decision process)
- Competitive intel
- Risk flags (declining engagement, ghost risk)
- AI recommendations (top 3-5 next actions)

**How to test:**
```bash
curl -X POST \
  'https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/generate-company-intelligence-report' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"company_id": "actual-company-id-here"}'
```

## Where to Access in the UI

### For Admins:
1. **ML Dashboard** (Main overview)
   - Navigate to: **Sidebar → Management → ML Dashboard**
   - Shows company intelligence leaderboard
   - Live insights feed
   - Data coverage metrics

2. **Company-Specific Intelligence**
   - Go to any company page
   - Click **"Intelligence" tab** (Admin/Partner only)
   - View recent interactions, stakeholder map, smart actions
   - Click **"ML Insights" tab** to see how interactions affect matching

3. **Stakeholder Profiles**
   - Click on any stakeholder name
   - View detailed communication profile
   - See influence score and role classification
   - Access full interaction history

### For Partners:
1. **Company Intelligence Tab**
   - Navigate to your company page
   - Access **"Intelligence" tab**
   - View insights for your organization

## Testing with Real Data

### Step 1: Ensure You Have Interaction Data
```sql
-- Check if you have interactions
SELECT COUNT(*) FROM company_interactions;

-- Get a sample company with interactions
SELECT 
  c.id,
  c.name,
  COUNT(ci.id) as interaction_count
FROM companies c
LEFT JOIN company_interactions ci ON c.id = ci.company_id
GROUP BY c.id, c.name
HAVING COUNT(ci.id) > 0
LIMIT 5;
```

### Step 2: Test Intelligence Extraction
1. Open ML Dashboard
2. Navigate to Company Intelligence Leaderboard
3. Click on any company with interaction data
4. View the Intelligence tab
5. Verify that:
   - Recent interactions are displayed
   - Stakeholder map shows engagement scores
   - Smart actions are suggested
   - Metrics are accurate

### Step 3: Verify Edge Function Logs
```bash
# View logs for extract-interaction-insights
# (Use Lovable Cloud backend interface or Supabase dashboard)

# Check for errors in ai_usage_logs table
SELECT 
  function_name,
  success,
  error_message,
  created_at
FROM ai_usage_logs
WHERE function_name LIKE '%interaction%'
ORDER BY created_at DESC
LIMIT 10;
```

## Expected Results

### After Running extract-interaction-insights:
- New records in `interaction_insights` table
- Insights include: urgency score, budget signals, sentiment scores
- Timeline mentions captured
- Next actions suggested

### After Running calculate-stakeholder-influence:
- Updated `engagement_score` in `company_stakeholders`
- Role classifications updated (Decision Maker, Influencer, etc.)
- New records in `stakeholder_relationships`

### After Running generate-company-intelligence-report:
- Comprehensive JSON report with all sections
- Cached in `interaction_ml_features` for 24h
- Includes actionable recommendations

## Troubleshooting

### Issue: "No interaction data found"
**Solution:** Ensure you have logged interactions for the company. Use the Interaction Entry page or import WhatsApp chats.

### Issue: "AI rate limit exceeded"
**Solution:** Wait a few minutes before retrying. Lovable AI has rate limits per workspace.

### Issue: "Stakeholder not found"
**Solution:** Run `resolve-stakeholder-entities` function first to match names to stakeholder records.

### Issue: "Empty report"
**Solution:** Company needs at least 3-5 interactions for meaningful intelligence extraction.

## Next Steps

1. **Phase 5:** Integrate interaction features into ML matching
2. **Phase 6:** Add real-time alerts for high-urgency signals
3. **Phase 7:** Build automated weekly intelligence digests

## Cost Estimation
- Each intelligence extraction: ~1000 tokens (~€0.01)
- 50 interactions/day: ~€0.50/day = ~€15/month
- Total operational cost: ~€25/month (including storage)
