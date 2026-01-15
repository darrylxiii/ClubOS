# 🛡️ Loading & Timeout Failsafe Rules

## ❌ **NEVER DO THIS**

### 1. NEVER have loading states without timeouts
```typescript
// ❌ BAD - Can load forever
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetchData().then(() => setLoading(false));
}, []);
```

### 2. NEVER use long timeouts (>5 seconds)
```typescript
// ❌ BAD - User waits too long
setTimeout(() => setLoading(false), 15000);
```

### 3. NEVER ignore timeout in async operations
```typescript
// ❌ BAD - Can hang forever
await supabase.auth.getSession();
```

### 4. NEVER block UI without escape hatch
```typescript
// ❌ BAD - User is trapped
if (loading) return <Spinner />;
```

---

## ✅ **ALWAYS DO THIS**

### 1. ALWAYS add aggressive timeouts (3-5 seconds max)
```typescript
// ✅ GOOD - Force timeout after 3 seconds
useEffect(() => {
  let mounted = true;
  const timeout = setTimeout(() => {
    if (mounted) {
      console.error('[Component] Timeout - forcing loading off');
      setLoading(false);
    }
  }, 3000);
  
  // ... your async logic
  
  return () => {
    mounted = false;
    clearTimeout(timeout);
  };
}, []);
```

### 2. ALWAYS use Promise.race for network calls
```typescript
// ✅ GOOD - Race against timeout
const fetchWithTimeout = async () => {
  const dataPromise = supabase.from('table').select();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), 5000)
  );
  
  return Promise.race([dataPromise, timeoutPromise]);
};
```

### 3. ALWAYS provide error UI after timeout
```typescript
// ✅ GOOD - Show error with reload option
const [error, setError] = useState(false);

useEffect(() => {
  const timeout = setTimeout(() => setError(true), 5000);
  return () => clearTimeout(timeout);
}, []);

if (error) {
  return (
    <div>
      <h2>Page Failed to Load</h2>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  );
}
```

### 4. ALWAYS use cleanup flags
```typescript
// ✅ GOOD - Prevent state updates after unmount
useEffect(() => {
  let mounted = true;
  
  async function load() {
    const data = await fetch();
    if (mounted) setData(data);
  }
  
  return () => { mounted = false };
}, []);
```

---

## 🎯 **SPECIFIC RULES FOR AUTH**

### AuthContext Must Have:
1. **3-second emergency timeout** - Force loading off
2. **2-second session check timeout** - Using Promise.race
3. **Error state** - Track initialization errors
4. **Mounted flag** - Prevent updates after unmount

### Example:
```typescript
useEffect(() => {
  let mounted = true;
  let authInitialized = false;
  
  const emergencyTimeout = setTimeout(() => {
    if (mounted && !authInitialized) {
      setLoading(false);
      setAuthError('Timeout');
    }
  }, 3000);
  
  // Setup with Promise.race for session check
  const sessionPromise = supabase.auth.getSession();
  const sessionTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 2000)
  );
  
  Promise.race([sessionPromise, sessionTimeout])
    .then(() => {
      if (mounted) {
        authInitialized = true;
        setLoading(false);
      }
    });
  
  return () => {
    mounted = false;
    clearTimeout(emergencyTimeout);
  };
}, []);
```

---

## 📊 **PAGE LOADER RULES**

### Must Have:
1. **5-second timeout** - Show error UI
2. **Countdown timer** - Visual feedback before reload
3. **Multiple actions** - Reload + Go to Login
4. **Clear error message** - Tell user what to do

### Example:
```typescript
const PageLoader = () => {
  const [showError, setShowError] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setTimeout(() => setShowError(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (showError) {
    return (
      <div>
        <h1>Page Taking Too Long</h1>
        <Button onClick={() => window.location.reload()}>
          Reload ({countdown}s)
        </Button>
        <Button onClick={() => window.location.href = '/auth'}>
          Go to Login
        </Button>
      </div>
    );
  }

  return <Loader />;
};
```

---

## 🚨 **ENTERPRISE RULES (NEVER VIOLATE)**

### CRITICAL: Database Query Timeouts
```typescript
// ✅ ALWAYS wrap database queries with queryWithTimeout
import { queryWithTimeout } from "@/utils/queryTimeout";

const { data, error } = await queryWithTimeout(
  supabase.from('profiles').select().eq('id', userId).single(),
  3000 // 3 second timeout
);
```

### CRITICAL: Navigation Locks
```typescript
// ✅ ALWAYS use navigation locks to prevent race conditions
const navigationLock = useRef(false);

const navigateWithLock = (path: string) => {
  if (navigationLock.current) return;
  navigationLock.current = true;
  navigate(path, { replace: true });
  setTimeout(() => { navigationLock.current = false; }, 1000);
};
```

### CRITICAL: Single Auth Listener
```typescript
// ✅ NEVER have duplicate onAuthStateChange listeners
// Keep ONLY ONE listener in AuthContext or main component
// ❌ NEVER add additional listeners in child components
```

### CRITICAL: Network Monitoring
```typescript
// ✅ ALWAYS monitor network status on auth pages
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

---

## 🔍 **DEBUGGING CHECKLIST**

When loading loop occurs:

1. ✅ Check console logs for timeout messages
2. ✅ Verify emergency timeout is firing (should be ≤2s)
3. ✅ Check network tab for hanging requests
4. ✅ Look for missing cleanup in useEffect
5. ✅ Verify mounted flags are used
6. ✅ Check for race conditions in state updates
7. ✅ Confirm only ONE auth state listener exists
8. ✅ Verify all database queries have timeouts
9. ✅ Check navigation lock is preventing duplicates
10. ✅ Review performance metrics in console

---

## 💡 **TIMEOUT HIERARCHY**

```
Emergency Failsafe:    2 seconds  → Force loading off (AuthContext)
Auth Operations:       2 seconds  → Timeout with Promise.race
Database Queries:      3 seconds  → Wrap with queryWithTimeout
ProtectedRoute:        3 seconds  → Force redirect to /auth
Edge Function Calls:   5 seconds  → Wrap with queryWithTimeout
Page Loader:           5 seconds  → Show reload UI
Form Submit:          10 seconds  → Show error message
OAuth Flow:           30 seconds  → Show timeout error
Background Task:      30 seconds  → Log warning only
```

---

## 🚨 **ENTERPRISE PRODUCTION CHECKLIST**

Before deploying:

**Auth & Loading:**
- [ ] AuthContext emergency timeout ≤2 seconds
- [ ] ProtectedRoute has 3-second timeout
- [ ] Only ONE auth state listener exists
- [ ] All loading states have aggressive timeouts
- [ ] PageLoader has error UI after 5 seconds

**Database & Network:**
- [ ] All database queries wrapped with queryWithTimeout
- [ ] All edge function calls have timeouts
- [ ] Network status is monitored on auth pages
- [ ] OAuth flows have 30-second timeout
- [ ] All network calls use Promise.race

**Error Handling:**
- [ ] All error states have UI feedback
- [ ] OAuth errors are caught and displayed
- [ ] Timeout errors show reload options
- [ ] Network offline shows clear message

**Performance & Safety:**
- [ ] All useEffects have cleanup
- [ ] All async operations have mounted checks
- [ ] Navigation uses locks to prevent races
- [ ] Performance metrics logged to console
- [ ] Load times tracked (target: <2s auth, <3s TTI)
- [ ] Console logs help debug issues

---

## 📝 **ENTERPRISE CODE REVIEW QUESTIONS**

Ask these for every PR:

1. "What happens if this async call never resolves?"
2. "Is there a timeout on this loading state?"
3. "Can the user escape if this hangs?"
4. "Do we show an error message after timeout?"
5. "Is there cleanup in this useEffect?"
6. "Is this database query wrapped with queryWithTimeout?"
7. "Are there duplicate auth state listeners?"
8. "Does navigation use a lock to prevent races?"
9. "Is network status monitored?"
10. "Are performance metrics being tracked?"
11. "Is the timeout aggressive enough? (<5s for critical paths)"
12. "Does OAuth have proper error handling?"

---

## 🎓 **LEARNING FROM THIS BUG**

### Root Cause:
- AuthContext timeout was too long (3s → should be 2s)
- Database queries had no timeouts
- Duplicate auth state listeners causing race conditions
- No navigation locks causing duplicate navigation attempts
- Edge function calls had no timeouts
- No network status monitoring
- OAuth flows had no timeout handling

### Enterprise Solution:
- **2-second** AuthContext emergency timeout
- **3-second** timeout for all database queries via queryWithTimeout
- **3-second** ProtectedRoute timeout
- **5-second** timeout for edge function calls
- Removed duplicate auth listeners (consolidated to ONE)
- Added navigation locks to prevent race conditions
- Network status monitoring with user feedback
- OAuth 30-second timeout with error recovery
- Performance metrics tracking (load time, TTI)
- Comprehensive error boundaries

### Prevention Strategy:
- Follow enterprise rules religiously
- ALWAYS wrap database queries with queryWithTimeout
- NEVER add duplicate auth state listeners
- ALWAYS use navigation locks
- ALWAYS monitor network status on auth pages
- Test with slow networks (Chrome DevTools throttling)
- Monitor performance metrics in console
- Maximum 2s for auth initialization
- Maximum 3s for Time to Interactive

---

## 🔗 **RELATED FILES**

- `src/contexts/AuthContext.tsx` - 2s emergency timeout, Promise.race, performance tracking
- `src/components/ProtectedRoute.tsx` - 3s loading timeout with redirect
- `src/pages/Auth.tsx` - Network monitoring, navigation locks, queryWithTimeout
- `src/utils/queryTimeout.ts` - Universal timeout wrapper for database/edge functions
- `src/App.tsx` - PageLoader with 5s timeout and error UI
- `src/pages/ForgotPassword.tsx` - Form submit with timeout
- `LOADING_FAILSAFE_RULES.md` - This comprehensive enterprise rulebook

---

## 📊 **AUTH PAGE SPECIFIC CHECKLIST**

Use this for Auth.tsx reviews:

- [ ] All database queries use queryWithTimeout (3s)
- [ ] All edge function calls use queryWithTimeout (5s)
- [ ] Only ONE onAuthStateChange listener exists
- [ ] Navigation uses navigationLock to prevent races
- [ ] Onboarding check has debounce/flag protection
- [ ] Network status monitored (online/offline events)
- [ ] OAuth has 30s timeout and error recovery
- [ ] OAuth errors in URL params are caught
- [ ] Performance metrics tracked (TTI logged)
- [ ] Loading states have escape hatches
- [ ] Error boundaries wrap critical sections

---

**Last Updated:** 2025-11-13  
**Status:** ✅ Enterprise-Grade Implementation Complete  
**Target Metrics:** <2s auth init, <3s TTI, <1% timeout rate
