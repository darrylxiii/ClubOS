# Wave 2 - Error & Loading States Guide

## Error Handling ✅

### Hook: useErrorHandler
**Location**: `src/hooks/useErrorHandler.ts` ⭐ NEW

**Features**:
- Centralized error state management
- Automatic toast notifications
- Sentry integration
- Console logging (dev only)
- Helper functions: `getErrorMessage()`, `isNetworkError()`, `isAuthError()`

### Component: ErrorState
**Location**: `src/components/ui/error-state.tsx` (existing)

**3 Variants**:
- `card` (default) - Enclosed in a card
- `inline` - Compact inline display
- `page` - Full-page error

### Example: SourceEffectiveness
[SourceEffectiveness.tsx](src/pages/admin/SourceEffectiveness.tsx)

```typescript
// 1. Import
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { ErrorState } from "@/components/ui/error-state";

// 2. Initialize
const { error, handleError, clearError } = useErrorHandler();

// 3. Wrap API calls with try/catch
const fetchData = async () => {
  try {
    setLoading(true);
    clearError();
    const { data, error: fetchError } = await supabase.from('table').select();
    if (fetchError) throw fetchError;
    setData(data);
  } catch (err) {
    handleError(err, { showToast: true });
  } finally {
    setLoading(false);
  }
};

// 4. Render error state
{error ? (
  <ErrorState
    message={error.message}
    onRetry={fetchData}
    variant="card"
  />
) : loading ? (
  <Skeleton />
) : (
  <DataDisplay data={data} />
)}
```

---

## Loading States

### Component: UnifiedLoader
**Location**: `src/components/ui/unified-loader.tsx` (existing)

**4 Variants**:
- `page` - Full-page spinner
- `overlay` - Overlay on existing content
- `section` - Section-level loading
- `inline` - Small inline spinner

### Pattern
```typescript
import { UnifiedLoader } from "@/components/ui/unified-loader";

// In component
{loading && <UnifiedLoader variant="section" message="Loading data..." />}

// OR for Suspense boundaries
<Suspense fallback={<UnifiedLoader variant="page" />}>
  <LazyComponent />
</Suspense>
```

### Skeleton Component
**Location**: `src/components/ui/skeleton.tsx` (existing)

```typescript
import { Skeleton } from "@/components/ui/skeleton";

// Table skeleton
{[...Array(5)].map((_, i) => (
  <div key={i} className="flex gap-4">
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="space-y-2 flex-1">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
))}
```

---

## Combined Pattern (Complete)

```typescript
function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError } = useErrorHandler();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      const { data, error: fetchError } = await supabase
        .from('table')
        .select('*');

      if (fetchError) throw fetchError;
      setData(data);
    } catch (err) {
      handleError(err, {
        showToast: true,
        reportToSentry: true
      });
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Render states
  if (error) {
    return (
      <ErrorState
        title="Failed to Load"
        message={error.message}
        onRetry={fetchData}
        variant="card"
      />
    );
  }

  if (loading) {
    return <Skeleton className="h-[400px]" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState message="No data found" />;
  }

  return <DataDisplay data={data} />;
}
```

---

## Files Created/Modified

**NEW**:
- [useErrorHandler.ts](src/hooks/useErrorHandler.ts) ⭐

**Modified**:
- [SourceEffectiveness.tsx](src/pages/admin/SourceEffectiveness.tsx) - Error handling example

**Existing** (ready to use):
- [error-state.tsx](src/components/ui/error-state.tsx)
- [unified-loader.tsx](src/components/ui/unified-loader.tsx)
- [skeleton.tsx](src/components/ui/skeleton.tsx)

---

## Quick Adoption Checklist

For each data-fetching component:
- [ ] Import `useErrorHandler` and `ErrorState`
- [ ] Add error state: `const { error, handleError, clearError } = useErrorHandler()`
- [ ] Wrap fetch calls in try/catch with `handleError(err, { showToast: true })`
- [ ] Add error render: `if (error) return <ErrorState ... />`
- [ ] Call `clearError()` before refetch

---

## Score Impact

**Wave 2 now at**: 70% complete (5/6 tasks)
- ✅ Confirmations
- ✅ Form accessibility
- ✅ Debounce
- ✅ Pagination
- ✅ **Error states** (pattern + example) ⭐ NEW
- ⬜ Loading states (infrastructure exists, needs adoption)

**Projected score**: 72/100 (+8 from baseline)
