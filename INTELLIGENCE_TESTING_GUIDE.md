# Intelligence Extraction Testing Guide

## ✅ Phase A Complete: ML Tables Created

The following tables have been successfully created:
- ✅ `ml_models` - Track ML model versions
- ✅ `ml_predictions` - Store candidate-job match predictions
- ✅ `ml_ab_tests` - A/B testing framework
- ✅ `ml_model_metrics` - Performance tracking
- ✅ `ml_feedback` - User feedback on predictions

**Note**: `ml_training_data` was intentionally NOT created. Training data now comes from real-time interactions, not historical backfill.

## ✅ Phase B Complete: Backfill Removed

- ✅ Removed "Backfill Training Data" button from ML Dashboard
- ✅ Removed `backfillTrainingData` function from useMLMatching hook
- ✅ Updated both `EnhancedMLDashboard.tsx` and `MLDashboard.tsx`

## ✅ Phase C Complete: Partner Context Added

- ✅ Added partner team members display to `CompanyIntelligenceSummary`
- ✅ Partner members now visible in company intelligence views
- ✅ Shows role, name, email, and avatar for each partner

## ✅ Phase D Complete: Dashboard Loading Fixed

- ✅ Graceful error handling for missing data
- ✅ Proper type casting for ML tables
- ✅ Empty states with helpful guidance

---

## 🧪 Testing the Intelligence Extraction Flow

### Prerequisites

1. **Admin Access**: You need admin role to access ML Dashboard
2. **Company with Interactions**: At least one company with logged interactions
3. **Edge Functions**: All 3 AI functions are deployed:
   - `extract-interaction-insights`
   - `calculate-stakeholder-influence`
   - `generate-company-intelligence-report`

### Step 1: Create Sample Interaction Data

**Option A: Via UI (Recommended)**
1. Navigate to a company page
2. Go to "Intelligence" tab
3. Click "Log New Interaction"
4. Fill in interaction details:
   - Type: email, meeting, phone, etc.
   - Date: Recent date
   - Participants: Add stakeholders
   - Content: Detailed interaction notes
5. Save the interaction

**Option B: Via Database Insert**
```sql
INSERT INTO public.company_interactions (
  company_id,
  interaction_type,
  interaction_date,
  participants,
  content,
  created_by
) VALUES (
  'your-company-id',
  'meeting',
  NOW() - INTERVAL '2 days',
  '[{"name": "John Smith", "role": "CTO", "email": "john@company.com"}]',
  'Discussed hiring needs for 3 senior developers. Urgency is high. Budget approved. Looking for full-stack engineers with React + Node.js experience.',
  auth.uid()
);
```

### Step 2: Extract Interaction Insights

**Test the `extract-interaction-insights` function:**

```bash
curl -X POST 'https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/extract-interaction-insights' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"interaction_id": "your-interaction-id"}'
```

**Expected Result:**
- Creates record in `interaction_insights` table
- Extracts hiring urgency, budget signals, sentiment
- Stores key quotes and pain points

**Verify in Database:**
```sql
SELECT * FROM interaction_insights 
WHERE interaction_id = 'your-interaction-id'
ORDER BY created_at DESC;
```

### Step 3: Calculate Stakeholder Influence

**Test the `calculate-stakeholder-influence` function:**

```bash
curl -X POST 'https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/calculate-stakeholder-influence' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company_id": "your-company-id"}'
```

**Expected Result:**
- Updates `company_stakeholders` table
- Calculates engagement scores
- Identifies decision-makers vs influencers

**Verify in Database:**
```sql
SELECT name, role_type, engagement_score, decision_maker_score, last_interaction
FROM company_stakeholders 
WHERE company_id = 'your-company-id'
ORDER BY engagement_score DESC;
```

### Step 4: Generate Intelligence Report

**Test the `generate-company-intelligence-report` function:**

```bash
curl -X POST 'https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/generate-company-intelligence-report' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company_id": "your-company-id", "period_days": 90}'
```

**Expected Result:**
- Creates comprehensive intelligence report
- Stores in `interaction_ml_features` table
- Includes:
  - Interaction summary (frequency, sentiment trends)
  - Stakeholder map (top influencers)
  - Hiring intelligence (urgency, budget, roles)
  - AI recommendations (opportunities, concerns, actions)

**Verify in Database:**
```sql
SELECT entity_id, computed_at, features
FROM interaction_ml_features
WHERE entity_id = 'your-company-id'
  AND entity_type = 'company'
ORDER BY computed_at DESC
LIMIT 1;
```

### Step 5: Verify Dashboard Display

**Test ML Dashboard:**
1. Navigate to `/ml-dashboard`
2. Should see:
   - ✅ No backfill button
   - ✅ Company intelligence leaderboard (if reports generated)
   - ✅ Interaction coverage stats
   - ✅ Data quality indicators

**Test Company Intelligence Tab:**
1. Navigate to company page
2. Go to "Intelligence" tab
3. Should see:
   - ✅ Intelligence report summary
   - ✅ Quick stats (interactions, health, urgency, sentiment)
   - ✅ Key stakeholders list
   - ✅ **NEW: Partner team members section**
   - ✅ AI recommendations

### Step 6: Verify Partner Team Integration

**Check Partner Members Display:**
1. Ensure company has partner users in `company_members` table
2. Navigate to company intelligence tab
3. Verify you see "Your Partner Team" section with:
   - Partner names and emails
   - Partner roles (owner, admin, recruiter)
   - Partner avatars

**Add Test Partner Member:**
```sql
INSERT INTO public.company_members (
  company_id,
  user_id,
  role,
  is_active
) VALUES (
  'your-company-id',
  'your-user-id',
  'partner',
  true
);
```

---

## 🎯 Success Criteria Checklist

- [ ] Can create company interactions via UI
- [ ] `extract-interaction-insights` function extracts insights successfully
- [ ] Insights appear in `interaction_insights` table
- [ ] `calculate-stakeholder-influence` updates stakeholder scores
- [ ] Stakeholders visible in `company_stakeholders` table
- [ ] `generate-company-intelligence-report` creates full report
- [ ] Report stored in `interaction_ml_features` table
- [ ] ML Dashboard loads without errors
- [ ] No backfill button visible
- [ ] Company intelligence tab displays report
- [ ] Partner team members visible in intelligence view
- [ ] All empty states show helpful guidance

---

## 🐛 Troubleshooting

### "No interactions found"
**Solution**: Create at least one interaction for the company using Step 1.

### "Rate limit exceeded"
**Solution**: AI functions are rate-limited. Wait 60 seconds and try again.

### "Stakeholder not found"
**Solution**: Run `calculate-stakeholder-influence` before generating report.

### "Empty report"
**Solution**: Ensure interactions have sufficient content (>50 characters).

### "Partner members not showing"
**Solution**: 
1. Check `company_members` table has active records for the company
2. Verify `profiles` table has user data
3. Check browser console for query errors

### Dashboard shows errors
**Solution**: 
1. Verify all 5 ML tables exist in database
2. Check browser console for specific error messages
3. Ensure user has admin role to access ML Dashboard

---

## 📊 Expected Database State After Testing

```sql
-- Should have data in these tables:
SELECT 
  (SELECT COUNT(*) FROM company_interactions WHERE company_id = 'test-company') as interactions,
  (SELECT COUNT(*) FROM interaction_insights WHERE interaction_id IN (SELECT id FROM company_interactions WHERE company_id = 'test-company')) as insights,
  (SELECT COUNT(*) FROM company_stakeholders WHERE company_id = 'test-company') as stakeholders,
  (SELECT COUNT(*) FROM interaction_ml_features WHERE entity_id = 'test-company') as reports,
  (SELECT COUNT(*) FROM company_members WHERE company_id = 'test-company') as partners;
```

**Expected Output:**
```
interactions | insights | stakeholders | reports | partners
-------------|----------|--------------|---------|----------
     3+      |    3+    |     2+       |    1    |   1+
```

---

## 🚀 Next Steps After Testing

Once testing is complete and successful:

1. **Add More Interactions**: Build up interaction history for more accurate intelligence
2. **Test with Multiple Companies**: Verify leaderboard sorting works correctly
3. **Partner Onboarding**: Train partner users on logging interactions properly
4. **Monitor AI Usage**: Check `ai_usage_logs` table for API consumption
5. **Schedule Reports**: Consider setting up periodic report generation via cron
6. **Export Capabilities**: Test intelligence report exports for client sharing

---

## 📝 Data Quality Guidelines

For best intelligence results:

**Interaction Content Should Include:**
- Specific role/job titles discussed
- Urgency signals ("ASAP", "urgent", "need by")
- Budget mentions ("approved", "$X budget", "cost")
- Pain points and challenges
- Decision timelines
- Competitor mentions
- Technology stack requirements

**Minimum Interaction Quality:**
- ✅ 100+ characters of content
- ✅ At least 1 participant with name + role
- ✅ Clear interaction type (meeting > email > phone)
- ✅ Recent date (within last 90 days)

**Avoid:**
- ❌ Generic notes without detail
- ❌ Copy-pasted templates
- ❌ Interactions without participants
- ❌ Content < 50 characters

---

## 🔐 Security Notes

- All edge functions use Lovable AI (Gemini 2.5 Flash) - no external API keys required
- RLS policies ensure users only see their company's intelligence
- AI usage is logged in `ai_usage_logs` for monitoring
- Partner members can only see intelligence for their assigned companies
- Stakeholder data includes PII - ensure proper access controls

---

## 💡 Tips for Demo/Testing

1. **Create 3-5 interactions** for one company to get meaningful intelligence
2. **Include variety**: Mix emails, meetings, and phone calls
3. **Add stakeholders**: Mention names, titles, and roles in content
4. **Use real scenarios**: Reference actual job openings, tech stacks, budgets
5. **Wait between steps**: Allow 2-3 seconds between function calls
6. **Check logs**: Monitor edge function logs in Supabase for detailed output
7. **Test partner view**: Log in as a partner user to see company intelligence

---

## 📧 Support

If issues persist after following this guide:
1. Check edge function logs in Lovable Cloud backend
2. Review browser console for client-side errors
3. Verify database schema matches migration
4. Ensure all RLS policies are active
