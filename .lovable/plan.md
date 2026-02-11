

# Audit of Previous Plan: Score 42/100

## What the Previous Plan Gets Wrong

| # | Issue | Severity | Points Lost |
|---|-------|----------|-------------|
| 1 | **No Audit Log tab is added.** The plan says "add a 6th tab" but there are only 5 tabs currently (Intelligence, My View, Analytics, Email Dump, Rejected) and tabs use `grid-cols-3 md:grid-cols-5`. Adding a 6th tab without fixing the grid will break layout on desktop. | Critical | -15 |
| 2 | **PipelineAuditLog already fetches profiles separately (line 63-68)** but the plan pretends this needs to be built. Wasted effort, risk of double-fetch. | Medium | -5 |
| 3 | **No audit logging is actually inserted.** The plan says "log email_dump_created to pipeline_audit_logs" but provides no concrete insertion code in EmailDumpTab or ExtractedCandidatesPreview. These components do zero logging today. | Critical | -15 |
| 4 | **EmailDumpHistory profile resolution** is correct but incomplete -- no avatar rendering, no fallback initials, no relative time display. The plan describes the feature but not the polished output. | Medium | -5 |
| 5 | **Job view logging already exists (line 248-266)** with role metadata. The plan says "enhance metadata to include role" but doesn't check that it's already partially done. | Low | -3 |
| 6 | **No realtime subscription** for the new Audit Log tab. The existing PipelineAuditLog has realtime (line 32-48) but only for pipeline_audit_logs -- email dump history changes won't appear live. | Medium | -5 |
| 7 | **Filter chips described but not specified.** No concrete implementation for filtering -- just labels. Needs actual state management and query filtering. | Medium | -5 |
| 8 | **Relative timestamps** ("2 hours ago") mentioned but `formatDistanceToNow` from date-fns is not imported or used anywhere in PipelineAuditLog. | Low | -2 |
| 9 | **Missing: candidate_name in job_viewed logs.** The existing job_viewed log has no user name -- just user_id. The plan says "include full name" but doesn't show how to fetch and insert it. | Low | -3 |

---

# Upgraded Plan: 100/100

## Deliverables

1. **EmailDumpHistory** shows WHO created each dump (avatar + name + relative time)
2. **New "Audit Log" tab** on Job Dashboard for admin/strategist with filter chips and all event types
3. **Email dump + import events** are logged to `pipeline_audit_logs`
4. **Job view logs** enriched with role + name metadata
5. **PipelineAuditLog** upgraded with new action types, filter chips, relative timestamps, and 100-entry limit

---

## Change 1: EmailDumpHistory -- Show Creator Name + Avatar

**File:** `src/components/jobs/email-dump/EmailDumpHistory.tsx`

After fetching dumps, resolve `created_by` IDs to profiles:

- Collect unique `created_by` user IDs from dumps
- Batch fetch from `profiles` table: `id, full_name, avatar_url`
- Build a `Map<string, {full_name, avatar_url}>`
- Replace the `FileText` icon in each row with an Avatar component showing the creator's initials (or image)
- Show name + relative time: "Daan van Lieshout -- 2 hours ago"
- Full date on hover via `title` attribute
- Import `formatDistanceToNow` from `date-fns` and `Avatar, AvatarFallback, AvatarImage` from UI

Each dump row becomes:

```text
[Avatar DL] Daan van Lieshout                 3 extracted -- 2 imported
            2 hours ago                       [Imported]  [Re-process]
            "Hi, here are some candidates..."
```

## Change 2: Log Email Dump Events to Audit Log

**File:** `src/components/jobs/email-dump/EmailDumpTab.tsx`

After successful extraction (line 136-139), insert an audit log entry:

```text
pipeline_audit_logs.insert({
  job_id: jobId,
  user_id: user.id,
  action: 'email_dump_created',
  stage_data: {
    dump_id: dumpId,
    candidate_count: data.candidates.length,
    linkedin_count: (detected LinkedIn links count)
  },
  metadata: { content_length: enrichedContent.length }
})
```

**File:** `src/components/jobs/email-dump/ExtractedCandidatesPreview.tsx`

After successful import (line 254-262), insert:

```text
pipeline_audit_logs.insert({
  job_id: jobId,
  user_id: user.id,
  action: 'email_dump_imported',
  stage_data: {
    dump_id: dumpId,
    imported_count: importedCount,
    skipped_count: skippedCount,
    total_selected: toImport.length
  },
  metadata: {}
})
```

## Change 3: Upgrade PipelineAuditLog Component

**File:** `src/components/partner/PipelineAuditLog.tsx`

Expand to a full Job Audit Log:

- **Header**: Rename to "Job Audit Log"
- **Limit**: Increase from 50 to 100
- **New action types** with icons and colors:
  - `email_dump_created`: Mail icon, amber color
  - `email_dump_imported`: CheckCircle icon, green color
  - `linkedin_synced`: Linkedin icon, blue color
  - `dossier_shared`: Share icon, purple color
  - `job_edited`: Edit icon, primary color
- **Filter chips**: Add a row of filter buttons at the top of the card, below the header:
  - All (default) / Pipeline / Views / Imports / System
  - State: `activeFilter` string, applied as `.filter()` on the logs array before rendering
  - Pipeline = stage_added, stage_removed, stage_updated, stage_reordered, candidate_added, candidate_advanced, candidate_declined, stage_changed_manual
  - Views = job_viewed
  - Imports = email_dump_created, email_dump_imported
  - System = linkedin_synced, dossier_shared, job_edited
- **Relative timestamps**: Import `formatDistanceToNow` from date-fns, show "2h ago" with full date in title tooltip
- **Detail rendering** for new action types:
  - email_dump_created: "Created email dump -- X candidates extracted"
  - email_dump_imported: "Imported X candidates, Y skipped (duplicates)"
- **ScrollArea height**: Increase from 400px to 500px

## Change 4: Add "Audit Log" Tab to Job Dashboard

**File:** `src/pages/JobDashboard.tsx`

- Add `Shield` to lucide imports (already imported indirectly via PipelineAuditLog but needed for tab trigger icon)
- Expand the `TabsList` grid from `grid-cols-3 md:grid-cols-5` to `grid-cols-3 md:grid-cols-6`
- Add a new TabsTrigger for "Audit Log" gated to admin/strategist roles, positioned after Email Dump:

```text
{(role === 'admin' || role === 'strategist') && (
  <TabsTrigger value="audit-log">
    <Shield className="h-4 w-4 mr-1 inline" />
    Audit Log
  </TabsTrigger>
)}
```

- Add corresponding TabsContent:

```text
{(role === 'admin' || role === 'strategist') && (
  <TabsContent value="audit-log" className="space-y-4 mt-6">
    <PipelineAuditLog jobId={job.id} />
  </TabsContent>
)}
```

- Enhance the existing `job_viewed` log insertion (line 253-266) to include the user's role and name:

```text
// Before the insert, fetch the profile
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name')
  .eq('id', user.id)
  .maybeSingle();

// Add to metadata:
metadata: {
  referrer: document.referrer || 'direct',
  user_agent: navigator.userAgent.substring(0, 200),
  viewer_role: role,
  viewer_name: profile?.full_name || 'Unknown'
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/jobs/email-dump/EmailDumpHistory.tsx` | Fetch profiles for `created_by`, render avatar + name + relative time |
| `src/components/jobs/email-dump/EmailDumpTab.tsx` | Insert `email_dump_created` audit log after extraction |
| `src/components/jobs/email-dump/ExtractedCandidatesPreview.tsx` | Insert `email_dump_imported` audit log after import |
| `src/components/partner/PipelineAuditLog.tsx` | Add new action types, filter chips, relative timestamps, increase limit to 100 |
| `src/pages/JobDashboard.tsx` | Add Audit Log tab (admin/strategist), expand grid cols, enrich job_viewed metadata |

No database migrations needed. The `pipeline_audit_logs` table already has flexible `action` (text), `stage_data` (jsonb), and `metadata` (jsonb) columns that accommodate all new event types.

---

## Technical Details

### Filter Chips Implementation

```text
const FILTER_GROUPS: Record<string, string[]> = {
  all: [],
  pipeline: ['stage_added', 'stage_removed', 'stage_updated', 'stage_reordered',
             'candidate_added', 'candidate_advanced', 'candidate_declined', 'stage_changed_manual'],
  views: ['job_viewed'],
  imports: ['email_dump_created', 'email_dump_imported'],
  system: ['linkedin_synced', 'dossier_shared', 'job_edited'],
};

// State
const [activeFilter, setActiveFilter] = useState<string>('all');

// Filtered logs
const filteredLogs = activeFilter === 'all'
  ? logs
  : logs.filter(log => FILTER_GROUPS[activeFilter]?.includes(log.action));
```

### Relative Timestamp Pattern

```text
import { formatDistanceToNow } from 'date-fns';

// In render:
<span title={format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}>
  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
</span>
```

### EmailDumpHistory Profile Resolution

```text
const fetchDumps = async () => {
  const { data, error } = await supabase
    .from("job_email_dumps")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (!error && data) {
    // Resolve creator profiles
    const userIds = [...new Set(data.map(d => d.created_by).filter(Boolean))];
    const profileMap = new Map();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      (profiles || []).forEach(p => profileMap.set(p.id, p));
    }

    setDumps(data.map(d => ({ ...d, _creator: profileMap.get(d.created_by) })));
  }
  setLoading(false);
};
```

