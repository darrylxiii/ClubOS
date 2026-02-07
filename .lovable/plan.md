

# Unify Club AI: Kill the Duplicate, Wire Home Widget to the Real Backend

## Problem

There are currently **two separate AI backends**:

1. **`club-ai-chat`** (1463 lines) -- The full-power backend used by the `/club-ai` page. Has access to ALL data: emails, WhatsApp, SMS, calendar, meetings, CRM, deal pipeline, social data, predictive signals, success patterns, 30+ tools, search/think/canvas modes, image and document support.

2. **`quin-home-chat`** (502 lines) -- A stripped-down duplicate created for the home widget. Fetches far less data (no emails, no WhatsApp, no meetings, no calendar, no social, limited deal pipeline queries). This is why "active deals" shows 0 and answers are wrong.

The home widget talks to the weak backend. It needs to talk to the strong one.

Additionally, "QUIN" branding appears in ~66 files across the codebase. Everything must be renamed to "Club AI".

## Solution

### 1. Delete `quin-home-chat` Edge Function

Remove `supabase/functions/quin-home-chat/index.ts` entirely. It is a redundant, inferior copy.

### 2. Rewire Home Widget to `club-ai-chat`

Update `src/hooks/useQUINHomeChat.ts` to call `club-ai-chat` instead of `quin-home-chat`. This gives the home widget access to the same comprehensive data and tools.

Key changes:
- Change the fetch URL from `/functions/v1/quin-home-chat` to `/functions/v1/club-ai-chat`
- Pass `userId` in the request body (club-ai-chat expects it)
- The role-based context is already handled by `club-ai-chat` since it reads user roles and company data

### 3. Rename All "QUIN" References to "Club AI"

Across ~66 files, replace:
- "QUIN" with "Club AI" in user-facing text
- "Ask QUIN" with "Ask Club AI"
- "Powered by QUIN" with "Powered by Club AI"
- "QUIN is speaking" with "Club AI is speaking"
- "QUIN is thinking" with "Club AI is thinking"
- "QUIN Analytics" with "Club AI Analytics"
- "QUIN Advisor" with "Club AI Advisor"
- "QUIN Agent" with "Club AI Agent"
- "QUIN Strategist" with "Club AI Strategist"
- "QUIN Suggests" with "Club AI Suggests"

Also rename files and component names:
- `QUINHomeChatWidget.tsx` to `ClubAIHomeChatWidget.tsx`
- `QUINAnalyticsWidget.tsx` to `ClubAIAnalyticsWidget.tsx`
- `QUINAdvisorWidget.tsx` to `ClubAIAdvisorWidget.tsx`
- `EnhancedQUINAdvisor.tsx` to `EnhancedClubAIAdvisor.tsx`
- `QUINBackchannelSuggestions.tsx` to `ClubAIBackchannelSuggestions.tsx`
- `useQUINHomeChat.ts` to `useClubAIHomeChat.ts`
- `useQUINAnalytics.ts` to `useClubAIAnalytics.ts`

And update all imports across the codebase.

### 4. Update Edge Function System Prompts

In `club-ai-chat/index.ts`, replace "You are QUIN" and all QUIN references in the system prompt with "You are Club AI".

In `ai-chat/index.ts` (partner funnel chat), same replacement.

### 5. Remove from `supabase/config.toml`

Remove the `quin-home-chat` function entry.

## Files to Modify

| Category | Files | Change |
|---|---|---|
| **Delete** | `supabase/functions/quin-home-chat/index.ts` | Remove entirely |
| **Backend hook** | `src/hooks/useQUINHomeChat.ts` | Rename to `useClubAIHomeChat.ts`, point to `club-ai-chat`, pass `userId` |
| **Widget** | `src/components/clubhome/QUINHomeChatWidget.tsx` | Rename to `ClubAIHomeChatWidget.tsx`, update all QUIN text to Club AI |
| **Analytics** | `src/components/clubhome/QUINAnalyticsWidget.tsx` | Rename to `ClubAIAnalyticsWidget.tsx`, update text |
| **Analytics hook** | `src/hooks/useQUINAnalytics.ts` | Rename to `useClubAIAnalytics.ts` |
| **Advisor** | `src/components/communication/QUINAdvisorWidget.tsx` | Rename to `ClubAIAdvisorWidget.tsx`, update text |
| **Enhanced Advisor** | `src/components/communication/EnhancedQUINAdvisor.tsx` | Rename to `EnhancedClubAIAdvisor.tsx`, update text |
| **Backchannel** | `src/components/meetings/QUINBackchannelSuggestions.tsx` | Rename to `ClubAIBackchannelSuggestions.tsx` |
| **Home pages** | `CandidateHome.tsx`, `PartnerHome.tsx`, `AdminHome.tsx` | Update imports and comments |
| **Config** | `supabase/config.toml` | Remove quin-home-chat entry |
| **Edge functions** | `club-ai-chat/index.ts`, `ai-chat/index.ts`, `quin-home-chat/index.ts` prompts | Remove QUIN, use Club AI |
| **All 66 files** | Various `.tsx`/`.ts` files | Replace "QUIN" with "Club AI" in UI text, comments, function names |

## Why This Fixes the Data Problem

The home widget currently calls `quin-home-chat` which:
- Does NOT fetch deal pipeline properly (fetches with `.eq('company_id', companyId)` but the partner context fetcher has bugs -- applications query fetches `.limit(0)`)
- Does NOT include emails, WhatsApp, SMS, calendar, meetings, social data
- Does NOT include predictive signals or success patterns
- Has a simplified tool set without search/think/canvas modes

After this change, the home widget will use `club-ai-chat` which has the complete, battle-tested data fetching pipeline that powers the full Club AI page.

