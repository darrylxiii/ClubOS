# Sprint 1: Critical Fixes Action Plan
*Duration: 2 weeks*
*Goal: Fix production-blocking issues*

## Week 1 Tasks

### 🔥 DAY 1: Security Fixes (CRITICAL)

#### Task 1.1: Fix AI Guest Access Authentication (2h)
**Priority: P0 - CRITICAL**
**Files**: `supabase/functions/module-ai-assistant/index.ts`

```typescript
// Add at top of handler:
const { data: { user }, error: authError } = await supabase.auth.getUser(
  req.headers.get('Authorization')?.replace('Bearer ', '') || ''
);

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Authentication required' }),
    { status: 401, headers: corsHeaders }
  );
}

// Add rate limiting (10 requests per minute per user)
const rateLimitKey = `ai_rate_limit:${user.id}`;
// ... implement rate limiting logic
```

**Acceptance Criteria**:
- [ ] Unauthenticated requests return 401
- [ ] Rate limiting active (10 req/min)
- [ ] Existing authenticated users not affected
- [ ] Test with guest user, authenticated user, expired token

---

#### Task 1.2: Add Missing Database Indexes (1h)
**Priority: P0 - CRITICAL**
**Files**: Create new migration

```sql
-- Migration: add_performance_indexes

-- Applications queries
CREATE INDEX CONCURRENTLY idx_applications_user_job 
  ON applications(user_id, job_id);
  
CREATE INDEX CONCURRENTLY idx_applications_status_created 
  ON applications(status, created_at DESC);

-- Messages queries  
CREATE INDEX CONCURRENTLY idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);
  
CREATE INDEX CONCURRENTLY idx_messages_sender 
  ON messages(sender_id, created_at DESC);

-- CRM queries
CREATE INDEX CONCURRENTLY idx_crm_activities_contact_date 
  ON crm_activities(contact_id, created_at DESC);
  
CREATE INDEX CONCURRENTLY idx_crm_deals_stage_value 
  ON crm_deals(stage, value DESC) 
  WHERE closed_at IS NULL;
  
CREATE INDEX CONCURRENTLY idx_crm_contacts_owner_score 
  ON crm_contacts(owner_id, lead_score DESC);

-- Profile company lookup
CREATE INDEX CONCURRENTLY idx_profiles_company_id 
  ON profiles(company_id) 
  WHERE company_id IS NOT NULL;

-- User roles lookup
CREATE INDEX CONCURRENTLY idx_user_roles_user_role 
  ON user_roles(user_id, role);
```

**Acceptance Criteria**:
- [ ] All indexes created successfully
- [ ] EXPLAIN ANALYZE shows indexes being used
- [ ] Dashboard load time <2s (currently 5-8s)
- [ ] No locks or downtime during index creation

---

#### Task 1.3: Add Input Validation to Edge Functions (4h)
**Priority: P0 - CRITICAL**
**Files**: 
- `supabase/functions/linkedin-job-import/index.ts`
- `supabase/functions/meeting-debrief/index.ts`
- `supabase/functions/calculate-match-score/index.ts`

```typescript
import { z } from 'zod';

// Example for linkedin-job-import
const linkedinImportSchema = z.object({
  companyId: z.string().uuid('Invalid company ID'),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').startsWith('https://www.linkedin.com/'),
  importType: z.enum(['job', 'company']),
  metadata: z.record(z.any()).optional()
});

// In handler:
try {
  const rawBody = await req.json();
  const validatedBody = linkedinImportSchema.parse(rawBody);
  // ... rest of logic
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({ 
        error: 'Validation failed', 
        details: error.errors 
      }),
      { status: 400, headers: corsHeaders }
    );
  }
  throw error;
}
```

**Acceptance Criteria**:
- [ ] Zod schemas for all edge function inputs
- [ ] Malformed requests return 400 with clear errors
- [ ] Valid requests process normally
- [ ] Add tests for validation edge cases

---

### 📱 DAY 2-3: Mobile Critical Fixes (1 day)

#### Task 1.4: Fix Job Application Flow on Mobile
**Priority: P0 - CRITICAL**
**Files**:
- `src/pages/JobDetail.tsx`
- `src/pages/Jobs.tsx`
- `src/pages/CompanyPage.tsx`

**Issues to Fix**:
1. **Apply button hidden by fixed header**
   ```tsx
   // Add safe area padding
   <div className="pb-20 md:pb-4"> {/* Mobile bottom padding */}
     <Button 
       className="fixed bottom-20 left-4 right-4 z-50 md:relative md:bottom-auto"
     >
       Apply Now
     </Button>
   </div>
   ```

2. **Job cards overflow**
   ```tsx
   // Fix grid on mobile
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
     {/* Cards should stack on mobile */}
   </div>
   ```

3. **Add swipe to dismiss**
   ```tsx
   import { useSwipeable } from 'react-swipeable';
   
   const handlers = useSwipeable({
     onSwipedLeft: () => handleNextJob(),
     onSwipedRight: () => handlePreviousJob(),
   });
   ```

**Acceptance Criteria**:
- [ ] Apply button visible on all mobile devices (test iPhone SE, Pixel 5)
- [ ] Cards don't overflow horizontally
- [ ] Swipe gestures work smoothly
- [ ] No horizontal scroll on any mobile viewport

---

### 🗄️ DAY 4: Database & CRM Fixes (4h)

#### Task 1.5: Add RLS Policies for CRM Tables
**Priority: P0 - CRITICAL**
**Files**: New migration

```sql
-- RLS policies for crm_contacts
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contact record"
  ON crm_contacts FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all contacts"
  ON crm_contacts FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Strategists can view assigned contacts"
  ON crm_contacts FOR SELECT
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'strategist'));

-- Similar policies for crm_deals, crm_activities, etc.
-- See Phase 1 migration for full schema
```

**Acceptance Criteria**:
- [ ] All CRM tables have RLS enabled
- [ ] Policies follow principle of least privilege
- [ ] Test with admin, strategist, candidate, partner roles
- [ ] No unauthorized access to CRM data

---

## Week 2 Tasks

### 🏗️ DAY 5-7: Refactor UserSettings.tsx (3 days)

#### Task 2.1: Extract Settings Components
**Priority: P1 - HIGH**
**Current**: 2,751 lines in one file  
**Target**: 5 focused components <500 lines each

**New File Structure**:
```
src/components/settings/
  ├── ProfileSettings.tsx       (profile, avatar, bio, links)
  ├── SecuritySettings.tsx      (password, 2FA, active sessions)
  ├── ConnectionsSettings.tsx   (OAuth, calendar, email sync)
  ├── NotificationSettings.tsx  (preferences, quiet hours)
  └── PrivacySettings.tsx       (visibility, data export/delete)
```

**Shared Components**:
```typescript
// src/components/settings/SettingsSection.tsx
export const SettingsSection = ({ 
  title, 
  description, 
  children 
}: SettingsSectionProps) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);
```

**Acceptance Criteria**:
- [ ] All functionality preserved (no regressions)
- [ ] Each file <500 lines
- [ ] Shared logic in hooks (useProfileUpdate, useSecuritySettings)
- [ ] Settings navigation works smoothly
- [ ] Test all settings flows end-to-end

---

### 🔧 DAY 8-9: Fix N+1 Queries (2 days)

#### Task 2.2: Optimize Messages Page Queries
**Priority: P1 - HIGH**
**Files**: `src/pages/Messages.tsx`, `src/hooks/useMessages.ts`

**Before** (N+1 problem):
```typescript
// Loads conversations
const conversations = await supabase.from('conversations').select('*');

// Then loads each user separately (N queries)
for (const conv of conversations) {
  const user = await supabase.from('profiles').select('*').eq('id', conv.other_user_id);
}
```

**After** (single query):
```typescript
const conversations = await supabase
  .from('conversations')
  .select(`
    *,
    other_user:profiles!conversations_other_user_id_fkey(
      id,
      full_name,
      avatar_url
    ),
    last_message:messages(
      content,
      created_at,
      sender:profiles(full_name)
    )
  `)
  .order('updated_at', { ascending: false })
  .limit(50);
```

**Similar fixes needed**:
- `src/pages/Applications.tsx` (applications → jobs → companies)
- `src/components/crm/ContactProfileView.tsx` (contact → activities → deals)
- `src/pages/CompanyPage.tsx` (company → members → jobs)

**Acceptance Criteria**:
- [ ] Messages page loads in <500ms (currently 3-5s)
- [ ] Network tab shows 1 query instead of N+1
- [ ] All data still displays correctly
- [ ] Apply same pattern to Applications, CompanyPage

---

### 🛡️ DAY 10: Centralized Error Handling (1 day)

#### Task 2.3: Create Error Handling Infrastructure
**Priority: P1 - HIGH**
**Files**: 
- `src/hooks/useAsyncError.ts` (new)
- `src/components/ErrorBoundary.tsx` (enhance)

```typescript
// src/hooks/useAsyncError.ts
export const useAsyncError = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useCallback(async <T,>(
    fn: () => Promise<T>,
    options?: {
      retry?: number;
      fallback?: T;
      silent?: boolean;
      invalidateQueries?: string[];
    }
  ): Promise<T | undefined> => {
    let lastError: Error | null = null;
    const retries = options?.retry || 0;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await fn();
        
        // Invalidate queries on success if needed
        if (options?.invalidateQueries) {
          options.invalidateQueries.forEach(key => 
            queryClient.invalidateQueries({ queryKey: [key] })
          );
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on auth errors
        if (error.message?.includes('401') || error.message?.includes('403')) {
          break;
        }
        
        // Wait before retry
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    
    // All retries failed
    if (!options?.silent && lastError) {
      toast({
        title: "Error",
        description: lastError.message,
        variant: "destructive"
      });
    }
    
    return options?.fallback;
  }, [toast, queryClient]);
};
```

**Usage Example**:
```typescript
const asyncError = useAsyncError();

const handleSave = async () => {
  await asyncError(
    () => supabase.from('profiles').update(data).eq('id', userId),
    { 
      retry: 2, 
      invalidateQueries: ['profile'],
      fallback: null
    }
  );
};
```

**Acceptance Criteria**:
- [ ] All async operations use useAsyncError
- [ ] Consistent error messages across app
- [ ] Automatic retry for transient failures
- [ ] No silent failures (all errors logged/shown)

---

### 💾 DAY 10: Onboarding Save & Resume (1 day)

#### Task 2.4: Add Onboarding Progress Saving
**Priority: P1 - HIGH**
**Files**:
- `src/pages/Onboarding.tsx`
- `src/pages/CandidateOnboarding.tsx`

**Database Schema**:
```sql
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_type TEXT NOT NULL, -- 'candidate', 'partner', 'strategist'
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL,
  step_data JSONB DEFAULT '{}'::jsonb,
  last_saved_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, onboarding_type)
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own onboarding progress"
  ON onboarding_progress FOR ALL
  USING (user_id = auth.uid());
```

**Frontend Implementation**:
```typescript
// Auto-save on step change
useEffect(() => {
  const saveProgress = async () => {
    await supabase.from('onboarding_progress').upsert({
      user_id: user.id,
      onboarding_type: 'candidate',
      current_step: currentStep,
      total_steps: 7,
      step_data: formData,
      last_saved_at: new Date().toISOString()
    }, { onConflict: 'user_id,onboarding_type' });
  };
  
  const debounced = debounce(saveProgress, 1000);
  debounced();
}, [currentStep, formData]);

// Resume on mount
useEffect(() => {
  const resumeProgress = async () => {
    const { data } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('onboarding_type', 'candidate')
      .maybeSingle();
      
    if (data && !data.completed_at) {
      setCurrentStep(data.current_step);
      setFormData(data.step_data);
      
      toast({
        title: "Welcome back!",
        description: `Resuming from step ${data.current_step} of ${data.total_steps}`
      });
    }
  };
  
  resumeProgress();
}, []);
```

**Acceptance Criteria**:
- [ ] Progress auto-saves every step
- [ ] Users can close browser and resume later
- [ ] Email reminder sent after 24h if incomplete
- [ ] "Save & Continue Later" button works
- [ ] Progress bar accurate

---

## Testing Checklist

### Before Deployment
- [ ] All migrations tested on staging database
- [ ] Database indexes created without locking tables
- [ ] RLS policies tested with all user roles
- [ ] Mobile fixes tested on real devices (iOS, Android)
- [ ] No TypeScript errors
- [ ] No console errors in production build
- [ ] Performance metrics improved (see targets)

### User Acceptance Testing
- [ ] Admin can access CRM, view all contacts
- [ ] Strategist can view assigned contacts only
- [ ] Candidate can complete onboarding, save/resume
- [ ] Partner can post job, view applications on mobile
- [ ] All roles can navigate without errors

### Performance Verification
```sql
-- Verify indexes being used
EXPLAIN ANALYZE 
SELECT * FROM applications 
WHERE user_id = 'xxx' 
ORDER BY created_at DESC 
LIMIT 20;

-- Should show "Index Scan using idx_applications_user_job"
```

---

## Rollback Plan

If critical issues found after deployment:

1. **Revert AI auth changes**:
   ```bash
   git revert <commit-hash>
   supabase functions deploy module-ai-assistant
   ```

2. **Drop indexes if causing issues**:
   ```sql
   DROP INDEX CONCURRENTLY idx_applications_user_job;
   -- etc.
   ```

3. **Disable RLS if blocking access**:
   ```sql
   ALTER TABLE crm_contacts DISABLE ROW LEVEL SECURITY;
   ```

---

## Sprint 1 Success Metrics

| Metric | Before | Target | Verified By |
|--------|--------|--------|-------------|
| Dashboard load time | 5-8s | <2s | Lighthouse |
| Mobile bounce rate | 65% | <50% | Analytics |
| Error rate | 2.3% | <1% | Sentry |
| Onboarding completion | 60% | >75% | Database query |
| CRM functionality | 0% | 100% | Manual testing |
| Security vulnerabilities | 3 critical | 0 | Security scan |

---

## Communication Plan

**Daily Standups**:
- What I completed yesterday
- What I'm working on today
- Any blockers

**Mid-Sprint Check (Day 5)**:
- Review completed tasks
- Adjust priorities if needed
- Demo progress to stakeholders

**Sprint Review (Day 10)**:
- Demo all completed features
- Show metrics improvement
- Gather feedback
- Plan Sprint 2

---

## Sprint 2 Preview

Next sprint focus:
- Dark mode consistency fixes
- TypeScript strict mode
- Accessibility improvements
- Loading skeleton states
- Data cleanup cron jobs

---

*Sprint Owner: Lead Engineer*  
*Start Date: [TBD]*  
*Review Date: [TBD + 2 weeks]*
