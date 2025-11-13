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

## 🔍 **DEBUGGING CHECKLIST**

When loading loop occurs:

1. ✅ Check console logs for timeout messages
2. ✅ Verify emergency timeout is firing
3. ✅ Check network tab for hanging requests
4. ✅ Look for missing cleanup in useEffect
5. ✅ Verify mounted flags are used
6. ✅ Check for race conditions in state updates

---

## 💡 **TIMEOUT HIERARCHY**

```
Emergency Failsafe: 3 seconds   → Force loading off
Network Request:    2-5 seconds → Show error
Page Loader:        5 seconds   → Show reload UI
Form Submit:        10 seconds  → Show error message
Background Task:    30 seconds  → Log warning only
```

---

## 🚨 **PRODUCTION CHECKLIST**

Before deploying:

- [ ] All loading states have timeouts
- [ ] All network calls use Promise.race
- [ ] All error states have UI feedback
- [ ] All useEffects have cleanup
- [ ] All async operations have mounted checks
- [ ] PageLoader has error UI after timeout
- [ ] AuthContext has emergency timeout
- [ ] Console logs help debug issues

---

## 📝 **CODE REVIEW QUESTIONS**

Ask these for every PR:

1. "What happens if this async call never resolves?"
2. "Is there a timeout on this loading state?"
3. "Can the user escape if this hangs?"
4. "Do we show an error message after timeout?"
5. "Is there cleanup in this useEffect?"

---

## 🎓 **LEARNING FROM THIS BUG**

### Root Cause:
- AuthContext timeout was too long (10s)
- No Promise.race on session check
- PageLoader timeout too long (15s)
- No aggressive emergency failsafe

### Solution:
- 3-second emergency timeout
- 2-second Promise.race for session
- 5-second PageLoader timeout
- Error UI with reload buttons

### Prevention:
- Follow these rules religiously
- Add timeouts to all loading states
- Test with slow networks
- Use Chrome DevTools throttling

---

## 🔗 **RELATED FILES**

- `src/contexts/AuthContext.tsx` - Auth initialization with failsafes
- `src/App.tsx` - PageLoader with timeout and error UI
- `src/pages/ForgotPassword.tsx` - Form submit with timeout

---

**Last Updated:** 2025-11-13  
**Status:** ✅ Implemented and Tested
