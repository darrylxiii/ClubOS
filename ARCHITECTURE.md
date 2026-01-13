# The Quantum Club OS: Architecture & Gravity

> **"Gravity is the force that pulls related code together."**

This codified architecture defines the laws of the system to prevent entropy and fragmentation.

## 0. The Prime Directive: Functionality First
**Rule:** User Experience > Code Metric Reduction.
- **Never compromise functionality** or risk stability just to reduce the module count.
- **UI/UX is Priority #1**. If a refactor risks breaking the user journey, **do not do it**.
- The "Gravity Linter" is an advisor, not a dictator. Exceptions are permitted for stability.

---

## 1. The Law of Domain Consolidation (Backend)
**Rule:** Do not create isolated `supabase/functions` for related logic.

### 1.1 Service-Based Architecture
We have moved from "Function-as-a-Service" (FaaS) fragmentation to **Domain-Driven Services**.

| Domain | Service Name | Directory | Responsibility |
|---|---|---|---|
| **AI & Intelligence** | `ai-integration` | `supabase/functions/ai-integration/` | All AI, LLM, Analysis, and Generation tasks. |
| **Identity & Access** | `auth-service` | *(Future)* | User management, RBAC, Profiling. |
| **Commerce** | `commerce-service` | *(Future)* | Billing, Invoicing, Payments. |

### 1.2 The `ai-integration` Pattern
All AI actions must be registered in the `ai-integration` router.
- **New Action**: Create `actions/my-new-action.ts`
- **Register**: Add to `index.ts` Router
- **Invoke**: Use `aiService.myNewAction()` in frontend.

---

## 2. The Law of Frontend Modularity
**Rule:** Do not create "Wrapper Files" (< 10 LOC) that simply export a component.

- **Bad**: `src/pages/Dashboard.tsx` -> `export default function() { return <Dashboard />; }`
- **Good**: `lazy(() => import("@/components/dashboard/Dashboard").then(...))` in `routes.tsx`.

### 2.1 Component Co-location
- Related components must stay together.
- Avoid "God Classes" (`utils.ts`, `types.ts`). Break them by domain (`crm-types.ts`, `finance-utils.ts`).

---

## 3. The Law of Security Gravity
**Rule:** High Privilege attracts Supervision.

### 3.1 `SECURITY DEFINER` Mandate
Any function marked `SECURITY DEFINER` **MUST**:
1.  Set `search_path = public` (or safe schema).
2.  Have explicit internal authorization checks (`is_super_admin()`, `can_modify_user()`).

---

## 4. Enforcement
These laws are enforced by the "Gravity Linter" (`scripts/gravity-check.ts`).
Run `npm run gravity:check` to verify architecture compliance.
