# Wave 2 - Pagination Implementation Guide

## Status: Hook Created ✅, Example Added ✅

Pagination improves performance and UX for tables with large datasets (100+ rows).

---

## New Infrastructure

### 1. usePagination Hook
**Location**: `src/hooks/usePagination.ts`

**Features**:
- Client-side pagination state management
- Automatic bounds checking
- Helper functions: `nextPage()`, `previousPage()`, `goToPage()`
- Dynamic page size support
- Calculates `startIndex` and `endIndex` for array slicing

**API**:
```typescript
const pagination = usePagination({
  totalItems: items.length,
  itemsPerPage: 20,  // default: 20
  initialPage: 1,    // default: 1
});

// Returns:
// {
//   currentPage, totalPages, pageSize,
//   startIndex, endIndex,
//   hasNextPage, hasPreviousPage,
//   goToPage, nextPage, previousPage, setPageSize
// }
```

### 2. generatePageNumbers Helper
Generates smart page number arrays with ellipsis for large page counts.

**Example output**:
- `totalPages=3`: `[1, 2, 3]`
- `totalPages=10, currentPage=5`: `[1, '...', 4, 5, 6, '...', 10]`

---

## Existing UI Component

**Location**: `src/components/ui/pagination.tsx`

Accessible pagination UI with:
- Previous/Next buttons with i18n labels
- Page number links
- Ellipsis for truncated ranges
- Active page highlighting
- Keyboard navigation support (aria-labels)

---

## Implementation Example

### Complete Example: AdminAuditLog

**File**: `src/pages/admin/AdminAuditLog.tsx`

**Before**: Rendered all 100 events at once (no pagination)

**After**: Paginated with 20 events per page

```typescript
// 1. Import
import { usePagination, generatePageNumbers } from "@/hooks/usePagination";
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious
} from "@/components/ui/pagination";

// 2. Initialize pagination
const pagination = usePagination({
  totalItems: events.length,
  itemsPerPage: 20,
});

// 3. Slice data
const paginatedEvents = events.slice(pagination.startIndex, pagination.endIndex);
const pageNumbers = generatePageNumbers(pagination.currentPage, pagination.totalPages);

// 4. Update description
<CardDescription>
  {t("auditLog.showingEvents", "Showing {{start}}-{{end}} of {{total}} events", {
    start: events.length > 0 ? pagination.startIndex + 1 : 0,
    end: pagination.endIndex,
    total: events.length
  })}
</CardDescription>

// 5. Render paginated data
{paginatedEvents.map((event) => (
  <EventRow key={event.id} event={event} />
))}

// 6. Add pagination UI
{events.length > pagination.pageSize && (
  <div className="mt-6 flex justify-center">
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => pagination.previousPage()}
            className={!pagination.hasPreviousPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
        {pageNumbers.map((page, index) => (
          <PaginationItem key={index}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={() => pagination.goToPage(page as number)}
                isActive={page === pagination.currentPage}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            onClick={() => pagination.hasNextPage()}
            className={!pagination.hasNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  </div>
)}
```

---

## Server-Side Pagination (Supabase)

For very large datasets (10,000+ rows), use server-side pagination:

```typescript
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 20;

// Fetch with pagination
const { data, error, count } = await supabase
  .from('audit_events')
  .select('*', { count: 'exact' })  // Get total count
  .order('created_at', { ascending: false })
  .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

// Use usePagination with server count
const pagination = usePagination({
  totalItems: count || 0,
  itemsPerPage: pageSize,
  initialPage: currentPage,
});

// Update page triggers new fetch
useEffect(() => {
  fetchData(pagination.currentPage);
}, [pagination.currentPage]);
```

---

## Admin Tables Needing Pagination

**High Priority** (100+ rows typical):
1. ✅ **AdminAuditLog** - audit_events table
2. ⬜ **AdminExports** - export jobs history
3. ⬜ **APIKeyManagement** - API keys list
4. ⬜ **ErrorLogs** - error logs table
5. ⬜ **ClosedJobs** - archived jobs
6. ⬜ **AdminCandidates** - all candidates table
7. ⬜ **SubscriptionManagement** - subscriptions list
8. ⬜ **SessionManagementPage** - active sessions
9. ⬜ **AdminAuditLog** (AuditLogViewer component)
10. ⬜ **BackgroundChecksPage** - background checks

**Medium Priority** (50-100 rows typical):
11. ⬜ **CustomFieldsManager** - custom fields
12. ⬜ **CustomRoleBuilder** - roles list
13. ⬜ **ConsentManagementPage** - consent logs
14. ⬜ **IPAllowlistManager** - IP allowlist
15. ⬜ **DataRetentionAdmin** - retention policies
16. ⬜ **AnnouncementsPage** - announcements
17. ⬜ **ApprovalChainsPage** - approval workflows
18. ⬜ **InterviewKitBuilder** - interview templates
19. ⬜ **CustomerHealthPage** - customer health scores
20. ⬜ **FinancialDashboard** - transactions table

**Lower Priority** (usually < 50 rows):
21-30. Various admin analytics and report pages

---

## Alternative: Virtualization

For **extremely long lists** (1000+ rows on same page), consider virtualization instead:

**Existing component**: `src/components/VirtualizedList.tsx`

**When to use virtualization vs pagination**:
- **Pagination**: Traditional table data, user expects pages
- **Virtualization**: Infinite scroll feeds, chat history, logs

**Example**: Already used in 10 files (Messages, InteractionsFeed, etc.)

---

## Testing Checklist

After adding pagination:
- [ ] Page navigation works (Previous/Next buttons)
- [ ] Page number links work
- [ ] Active page is highlighted
- [ ] Description shows correct range (e.g., "Showing 1-20 of 150")
- [ ] Pagination hides when total <= pageSize
- [ ] Search/filter resets to page 1
- [ ] Ellipsis appears for large page counts (10+ pages)
- [ ] Keyboard navigation works (Tab to buttons, Enter to activate)
- [ ] TypeScript compiles: `npx tsc --noEmit`

---

## Performance Impact

**Before pagination**:
- AdminAuditLog: Renders 100 DOM nodes at once
- Scroll performance degrades with 500+ rows
- Initial render slow

**After pagination (20 per page)**:
- Renders only 20 DOM nodes
- 5x fewer DOM manipulations
- Faster initial render
- Smooth scrolling

**Estimated improvement**: 40-60% faster render time for large tables

---

## Accessibility (WCAG 2.1)

The pagination component already meets:
- **2.1.1 Keyboard (Level A)**: Full keyboard navigation
- **2.4.3 Focus Order (Level A)**: Logical tab order
- **4.1.2 Name, Role, Value (Level A)**: Proper aria-labels

```html
<nav role="navigation" aria-label="pagination">
  <a aria-label="Go to previous page">Previous</a>
  <a aria-current="page">3</a>
  <a aria-label="Go to next page">Next</a>
</nav>
```

---

## Quick Reference

### Minimal Implementation (3 steps)

```typescript
// 1. Add pagination hook
const pagination = usePagination({ totalItems: items.length });
const paginatedItems = items.slice(pagination.startIndex, pagination.endIndex);

// 2. Render paginated items
{paginatedItems.map(item => <Item key={item.id} {...item} />)}

// 3. Add pagination UI (copy from AdminAuditLog.tsx lines 177-201)
```

### Common Patterns

**Reset to page 1 on filter change**:
```typescript
useEffect(() => {
  pagination.goToPage(1);
}, [searchQuery, filters]);
```

**Custom page size selector**:
```typescript
<Select value={pagination.pageSize.toString()} onValueChange={(v) => pagination.setPageSize(Number(v))}>
  <SelectItem value="10">10 per page</SelectItem>
  <SelectItem value="20">20 per page</SelectItem>
  <SelectItem value="50">50 per page</SelectItem>
</Select>
```

**Show total pages**:
```typescript
<span>Page {pagination.currentPage} of {pagination.totalPages}</span>
```
