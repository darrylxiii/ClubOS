

# Clean Up: Remove Dead FeedbackDatabase Route

## Current Issue
The dead lazy imports listed in the original audit were already cleaned up in the previous fix round. However, one leftover was missed:

- **Line 29**: `FeedbackDatabase` is still imported as a lazy component
- **Line 104**: `/admin/feedback` renders `FeedbackDatabase` as a standalone route
- **Line 171**: `/admin/feedback` has a legacy redirect to `/admin/communication-hub?tab=feedback`

The standalone route on line 104 shadows the redirect on line 171, meaning the redirect never fires. Since Feedback Database was merged into the Communication Hub as a tab, the standalone route and import are dead code.

## Changes

**File: `src/routes/admin.routes.tsx`**
1. Remove the `FeedbackDatabase` lazy import (line 29)
2. Remove the standalone route `{R("/admin/feedback", FeedbackDatabase)}` (line 104)
3. The existing redirect on line 171 will now correctly send `/admin/feedback` to the Communication Hub

This is a 3-line deletion with zero risk.

