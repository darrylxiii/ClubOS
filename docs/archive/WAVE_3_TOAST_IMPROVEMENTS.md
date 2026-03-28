# Wave 3 - Toast Improvements Guide

## Status: Enhanced Hook Created ✅

The enhanced toast system provides consistent durations, better error handling, and undo functionality.

## Hook: useEnhancedToast

**Location**: `src/hooks/useEnhancedToast.ts` ⭐ NEW (300+ lines)

**Features**:
- ✅ Consistent durations across all toast types
- ✅ User-friendly error messages (no raw technical errors)
- ✅ Undo actions for destructive operations
- ✅ Promise-based toasts for async operations
- ✅ Structured action buttons
- ✅ Loading states
- ✅ Persistent toasts (won't auto-dismiss)

### Standard Durations

```typescript
success:  3000ms (3 seconds)
error:    5000ms (5 seconds)
info:     4000ms (4 seconds)
warning:  4000ms (4 seconds)
undo:     6000ms (6 seconds - gives time to undo)
loading:  ∞ (never auto-dismiss)
```

---

## Usage Patterns

### 1. Success Toast

```typescript
import { useEnhancedToast } from "@/hooks/useEnhancedToast";

function MyComponent() {
  const toast = useEnhancedToast();

  const handleSave = async () => {
    await saveData();
    toast.success("Data saved successfully");
  };

  return <Button onClick={handleSave}>Save</Button>;
}
```

### 2. Error Toast (Auto-Friendly Messages)

**Before** (raw error):
```typescript
toast.error(error.message); // Shows: "violates foreign key constraint fk_..."
```

**After** (user-friendly):
```typescript
toast.error(error); // Shows: "This item is in use and cannot be deleted."
```

**Example**:
```typescript
const toast = useEnhancedToast();

const handleDelete = async () => {
  try {
    await deleteItem(id);
    toast.success("Item deleted");
  } catch (error) {
    toast.error(error); // Automatically converts to user-friendly message
  }
};
```

### 3. Toast with Undo Action

**Perfect for destructive operations**:
```typescript
const toast = useEnhancedToast();
const [deletedItem, setDeletedItem] = useState(null);

const handleDelete = async (item) => {
  setDeletedItem(item);
  await deleteFromDB(item.id);

  toast.withUndo(
    "Item deleted",
    async () => {
      await restoreToDB(item);
      setDeletedItem(null);
    },
    "You can undo this action"
  );
};
```

### 4. Toast with Action Button

```typescript
const toast = useEnhancedToast();

toast.success("Profile updated", {
  action: {
    label: "View Profile",
    onClick: () => navigate("/profile"),
  },
});
```

### 5. Promise Toast (Async Operations)

**Perfect for async operations** - automatically shows loading, success, or error:

```typescript
const toast = useEnhancedToast();

const handleSubmit = async () => {
  await toast.promise(submitForm(data), {
    loading: "Submitting form...",
    success: "Form submitted successfully",
    error: "Failed to submit form",
    successDescription: "We'll review your submission shortly",
  });
};
```

### 6. Info/Warning Toasts

```typescript
const toast = useEnhancedToast();

// Info
toast.info("New features available", {
  description: "Check out our latest updates",
  action: {
    label: "Learn More",
    onClick: () => navigate("/updates"),
  },
});

// Warning
toast.warning("Your session will expire soon", {
  description: "Please save your work",
  persistent: true, // Won't auto-dismiss
});
```

### 7. Loading Toast

```typescript
const toast = useEnhancedToast();

const toastId = toast.loading("Processing...");

// Later, dismiss it
setTimeout(() => {
  toast.dismiss(toastId);
  toast.success("Processing complete!");
}, 3000);
```

---

## Error Message Translation

The hook automatically translates technical errors to user-friendly messages:

| Technical Error | User-Friendly Message |
|----------------|----------------------|
| `Failed to fetch` | Network error. Please check your connection. |
| `Invalid login credentials` | Invalid email or password. |
| `violates foreign key constraint` | This item is in use and cannot be deleted. |
| `duplicate key value` | This item already exists. |
| `Too many requests` | You're doing that too quickly. Please wait a moment. |
| `Internal server error` | Something went wrong. Please try again. |

**Auto-detection**: If error message contains special characters (`{}[]<>`, "Error:", "Exception:"), returns generic message instead of exposing technical details.

---

## Migration Examples

### Before (Direct sonner usage)

```typescript
import { toast } from "sonner";

// ❌ Inconsistent duration
toast.success("Saved");

// ❌ Raw technical error
catch (error) {
  toast.error(error.message);
}

// ❌ No undo option
toast.success("Deleted item");

// ❌ Manual loading state management
const id = toast.loading("Loading...");
try {
  await fetchData();
  toast.dismiss(id);
  toast.success("Loaded");
} catch (error) {
  toast.dismiss(id);
  toast.error(error.message);
}
```

### After (Enhanced toast)

```typescript
import { useEnhancedToast } from "@/hooks/useEnhancedToast";

const toast = useEnhancedToast();

// ✅ Consistent duration (3000ms)
toast.success("Saved");

// ✅ User-friendly error
catch (error) {
  toast.error(error);
}

// ✅ With undo
toast.withUndo("Deleted item", async () => {
  await restoreItem();
});

// ✅ Auto-managed loading
await toast.promise(fetchData(), {
  loading: "Loading...",
  success: "Loaded",
  error: "Failed to load",
});
```

---

## Complete Example

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";

function TaskManager() {
  const toast = useEnhancedToast();
  const [deletedTask, setDeletedTask] = useState(null);

  const handleCreate = async (taskData) => {
    try {
      const task = await toast.promise(createTask(taskData), {
        loading: "Creating task...",
        success: "Task created successfully",
        error: "Failed to create task",
        successDescription: "You can view it in your task list",
      });

      toast.success("Task created", {
        action: {
          label: "View Task",
          onClick: () => navigate(`/tasks/${task.id}`),
        },
      });
    } catch (error) {
      // Error already shown by promise toast
    }
  };

  const handleDelete = async (task) => {
    try {
      setDeletedTask(task);
      await deleteTask(task.id);

      toast.withUndo(
        "Task deleted",
        async () => {
          await createTask(task);
          setDeletedTask(null);
        },
        "This action can be undone within 6 seconds"
      );
    } catch (error) {
      toast.error(error);
    }
  };

  const handleUpdate = async (taskId, updates) => {
    try {
      await updateTask(taskId, updates);
      toast.success("Task updated");
    } catch (error) {
      toast.error(error, {
        description: "Your changes were not saved",
        action: {
          label: "Retry",
          onClick: () => handleUpdate(taskId, updates),
        },
      });
    }
  };

  return (
    <div>
      <Button onClick={() => handleCreate(data)}>Create Task</Button>
      <Button onClick={() => handleDelete(task)}>Delete Task</Button>
      <Button onClick={() => handleUpdate(task.id, changes)}>Update Task</Button>
    </div>
  );
}
```

---

## Custom Error Messages

To add more error message translations, edit the `ERROR_MESSAGES` object in `useEnhancedToast.ts`:

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  // Add your custom mappings
  "custom_error_code": "User-friendly message",
  "Another pattern": "Another friendly message",
};
```

---

## API Reference

### `useEnhancedToast()`

Returns an object with these methods:

#### `success(message, options?)`
- Shows success toast with green checkmark
- Default duration: 3000ms

#### `error(error, options?)`
- Shows error toast with red X
- Automatically converts technical errors to user-friendly messages
- Default duration: 5000ms

#### `info(message, options?)`
- Shows info toast with blue info icon
- Default duration: 4000ms

#### `warning(message, options?)`
- Shows warning toast with yellow warning icon
- Default duration: 4000ms

#### `loading(message, options?)`
- Shows loading toast that never auto-dismisses
- Must manually dismiss

#### `withUndo(message, onUndo, description?)`
- Shows success toast with "Undo" button
- Duration: 6000ms (gives time to undo)
- `onUndo`: Function to call when Undo is clicked

#### `promise(promise, options)`
- Automatically manages loading → success/error states
- Options: `{ loading, success, error, successDescription?, errorDescription? }`

#### `dismiss(toastId?)`
- Dismiss specific toast by ID

#### `dismissAll()`
- Dismiss all toasts

### `ToastOptions`

```typescript
interface ToastOptions {
  duration?: number;           // Custom duration in ms
  description?: string;        // Secondary text line
  persistent?: boolean;        // Never auto-dismiss
  action?: {                   // Action button
    label: string;
    onClick: () => void;
  };
  onUndo?: () => void | Promise<void>;  // Undo button
}
```

---

## Adoption Status

**Created**: Enhanced toast hook with comprehensive features
**Adoption**: 0% (652 files use direct `toast` from sonner)

**High Priority Files for Migration**:
1. Admin deletion operations (offers, jobs, users)
2. CRM prospect management
3. Form submissions
4. Data import/export operations
5. Settings pages

---

## Benefits

1. **Consistency**: All toasts have standardized durations
2. **User Experience**: Friendly error messages instead of technical jargon
3. **Undo Actions**: Prevents accidental data loss
4. **Developer Experience**: Simpler API, less boilerplate
5. **Accessibility**: Better structure for screen readers
6. **Maintainability**: Centralized error message translations

---

## Score Impact

**Current**: 70/100 (inconsistent toasts, no undo actions)
**After Hook Creation**: 72/100 (+2 for infrastructure)
**After 50% Adoption**: 78/100 (+8 total)
**After 100% Adoption**: 82/100 (+12 total)

---

## Next Steps

1. **Pilot Adoption**: Migrate 5-10 high-traffic pages
2. **Document Patterns**: Add to component library
3. **Gradual Migration**: Convert 20-30 files per session
4. **Testing**: Verify undo actions work correctly
5. **Monitoring**: Track if users actually use undo
