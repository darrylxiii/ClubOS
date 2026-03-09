

# Full System Audit — Partner, Messaging, Scheduling, Dossier & Cross-Cutting

## Overall Score: 68/100

---

## Area-by-Area Breakdown

### 1. Partner Home Dashboard — 76/100
**What works:**
- Rich widget layout: Stats → AI Chat → Concierge → Offers/Messages → Daily Briefing → Alerts/Health/SLA → Interviews/Deadlines → Pipeline/Talent → Tracking
- `useQuery` used consistently across partner widgets (HealthScore, SmartAlerts, DailyBriefing, Billing)
- Real-time updates via `usePartnerRealtime`
- Data auto-population via `usePartnerDataPopulation`
- Staggered motion animations for polish

**Issues:**
- **`as any` used in 38 partner component files (332 occurrences)** — table names like `partner_smart_alerts`, `partner_ai_insights`, `candidate_shortlists`, `partner_sla_tracking` cast with `as any`, meaning zero type safety on queries (-5)
- **No companyId guard on Quick Actions section** — renders for all users even without companyId (-2)
- **PartnerConciergeCard** uses raw `useEffect` + fallback fetch pattern instead of `useQuery` (-2)
- **11 motion.div wrappers with sequential stagger delays** — renders everything eagerly with no lazy/virtualization; heavy on low-end devices (-1)

### 2. Partner Pipeline (CompanyApplications) — 65/100
**What works:**
- Role-aware data loading (admin sees all, partner sees own companies)
- Filter bar with stage, job, company, source, urgency
- ApplicationsTable and Analytics sub-components

**Issues:**
- **464 lines, `useState`+`useEffect` pattern** — no `useQuery`, no caching, refetches on every mount (-5)
- **Fetches user roles manually** instead of using `useRole()` context — duplicated auth logic (-3)
- **No realtime subscription** — pipeline changes by strategist/admin are invisible until refresh (-3)
- **No pagination** — loads all applications at once (-2)
- **`window.location.href` usage absent but manual `loadData()` called on every action** — no optimistic updates (-2)

### 3. Dossier System — 70/100
**What works:**
- Share tokens with expiration (72h default), domain allowlists, watermark text
- View tracking with viewer email/name/company
- Revocation support
- `DossierView.tsx` checks expiration client-side

**Issues:**
- **DossierView uses `.single()` without `.maybeSingle()`** — throws on missing token instead of showing "not found" gracefully (-3)
- **View count increment is client-side** (`update({ view_count: current + 1 })`) — race condition with concurrent viewers (-3)
- **No domain validation on dossier access** — `allowed_domains` exists in DB but `DossierView.tsx` never checks it; anyone with the token can view (-5)
- **No watermark rendering** — `watermark_text` stored but never rendered on the dossier page (-3)
- **No viewer identity capture** — DossierView doesn't prompt for email/name before showing content (-2)

### 4. Messages Page — 78/100
**What works:**
- Full-featured: conversations, threads, editing, reactions, typing indicators, read receipts
- Audio/video calls with connecting overlay
- Group info panel, context menus (pin, mute, archive, delete)
- Mobile-responsive with sidebar toggle
- System messages, load-more pagination

**Issues:**
- **458 lines monolithic** — should split into ConversationPanel + ChatPanel components (-3)
- **No `useQuery`** — uses custom `useMessages` hook with manual state, no React Query caching (-2)
- **`sendMessage` signature inconsistency** — sometimes called with `(content, [file], metadata)`, sometimes `(content, undefined, metadata)` (-1)
- **No message search** — search only filters conversation list titles, cannot search message content (-2)

### 5. Scheduling Page — 55/100
**What works:**
- Full booking link CRUD with advanced options (waitlist, approval, single-use, payment)
- Calendar connection status, availability onboarding wizard
- AI tab, team load dashboard, embed code generator, branding settings

**Issues:**
- **1,098 lines — largest page in the entire codebase** — massive monolith with all state at top level (-8)
- **`useState`+`useEffect` for everything** — no `useQuery`, no caching (-5)
- **All booking link creation state managed in a single `newLink` object with 20+ fields** — no form library (react-hook-form exists in deps) (-3)
- **No pagination on bookings** (-2)
- **No realtime subscription for new bookings** (-2)

### 6. `.single()` Usage Across Codebase — Systemic Risk
- **93 files contain `.single()`** — many are lookup-by-ID (safe) but several are lookup-by-filter that could return 0 rows and throw (-5 overall)
- Key offenders: `DossierView`, `CandidateOnboarding`, `PendingApproval`, `SourceInformationCard`, `CandidatePipelineContextBanner`

### 7. Type Safety — 60/100
- **332 `as any` casts in partner components alone** — tables not in generated types, meaning queries have zero compile-time checking
- Several tables queried via `supabase.from('table_name' as any)` — if table doesn't exist, fails silently at runtime
- This pattern is endemic and creates invisible bugs

---

## Summary Table

| Area | Score | Top Issue |
|------|-------|-----------|
| Partner Home Dashboard | 76 | 332 `as any` casts, no type safety |
| Partner Pipeline (CompanyApplications) | 65 | No useQuery, duplicated role logic, no realtime |
| Dossier System | 70 | No domain validation, no watermark render, race condition on view count |
| Messages | 78 | Monolithic, no message search |
| Scheduling | 55 | 1098 lines, no useQuery, no form validation |
| .single() usage | — | 93 files, several unsafe |
| Type safety | 60 | Systemic `as any` across partner components |
| **Overall** | **68/100** | |

---

## Fix Plan to 100/100

### Priority 1: Dossier Security (68 → 76)
1. Add domain validation in `DossierView.tsx` — check viewer's email domain against `allowed_domains` before showing content
2. Add viewer identity gate — prompt for name/email before revealing dossier content; record in `dossier_views`
3. Render watermark overlay on dossier page using `watermark_text` from share record
4. Fix `.single()` → `.maybeSingle()` in DossierView
5. Move view count increment to a server-side RPC or trigger to prevent race conditions

### Priority 2: Scheduling Decomposition (76 → 84)
6. Split `Scheduling.tsx` (1098 lines) into: BookingLinksTab, UpcomingBookingsTab, CalendarTab, SettingsTab, AnalyticsTab, AITab
7. Migrate booking links + bookings fetch to `useQuery`
8. Use `react-hook-form` + `zod` for booking link creation form
9. Add realtime subscription for new/updated bookings

### Priority 3: Partner Pipeline Quality (84 → 90)
10. Migrate `CompanyApplications.tsx` from `useState`/`useEffect` to `useQuery`
11. Replace manual role checking with `useRole()` context
12. Add realtime subscription for application status changes
13. Add cursor-based pagination

### Priority 4: `.single()` Safety Pass (90 → 94)
14. Audit all 93 files — convert filter-based `.single()` to `.maybeSingle()` where 0 rows is possible
15. Keep `.single()` only for ID lookups after insert (`.select().single()`)

### Priority 5: Polish & Search (94 → 100)
16. Add message content search to Messages page
17. Split Messages.tsx into ConversationListPanel + ChatPanel
18. Fix Quick Actions companyId guard in PartnerHome
19. Migrate PartnerConciergeCard to useQuery

**Recommendation:** Start with Priority 1 (Dossier Security) — these are real security gaps where shared dossiers bypass domain restrictions and don't capture viewer identity. Then tackle Priority 2 (Scheduling) as the largest maintainability debt.

