

# Update: Remove Partner Access to Talent Pool Search

## Change

In the approved plan's tool gating section, update the `search_talent_pool` row:

| Tool | Candidate | Partner | Admin |
|---|---|---|---|
| search_talent_pool | No | **No** | Yes |

Previously the plan listed Partner as "Yes" for this tool. The user has clarified Partners should not search the talent pool directly (may be added in the future).

## Implementation Detail

In `supabase/functions/club-ai-chat/index.ts`, when building the role-based tool filter, `search_talent_pool` will be excluded for both Candidates AND Partners -- only Admins (and Strategists) can use it.

The filter logic will look like:

```text
if (role === 'partner') {
  exclude: search_talent_pool, apply_to_job, generate_cover_letter, 
           update_candidate_tier, get_platform_health, get_revenue_summary, 
           search_all_users
}
```

This is a single-line change within the tool gating block that will be implemented as part of the larger role-based data access update. No additional files affected.

