# Wave 2 - Confirmation Dialog Implementation Guide

## Overview
This guide documents the pattern for adding confirmation dialogs to destructive actions (delete, remove, etc.) to prevent accidental data loss.

## Existing Hook: `useConfirmDialog`

The codebase already has a comprehensive confirmation dialog system at `src/components/ui/ConfirmActionDialog.tsx`.

### Hook API

```typescript
const { confirm, Dialog } = useConfirmDialog();
```

### Usage Pattern

```typescript
// 1. Import the hook
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";

// 2. Initialize in component
const { confirm, Dialog } = useConfirmDialog();

// 3. Wrap destructive action
const handleDelete = (id: string, name: string) => {
  confirm(
    {
      type: "delete",  // or "destructive", "archive", "cancel", "restore", "confirm"
      title: "Delete Item",
      description: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: "Delete",
    },
    async () => {
      // Perform the destructive action
      await deleteItem(id);
      toast.success("Item deleted");
      refreshData();
    }
  );
};

// 4. Add Dialog component to JSX (at end of component)
return (
  <div>
    {/* ... your component JSX ... */}
    <Dialog />
  </div>
);
```

## Action Types

The hook supports multiple action types with themed styling:

- **`delete`**: Red destructive action (trash icon)
- **`destructive`**: Red warning action (alert triangle icon)
- **`archive`**: Gray archive action (archive icon)
- **`cancel`**: Yellow warning action (x-circle icon)
- **`restore`**: Green positive action (rotate icon)
- **`confirm`**: Default confirmation (alert circle icon)

## Advanced Features

### Require Reason Input

```typescript
confirm(
  {
    type: "delete",
    title: "Delete User",
    description: "Please provide a reason for deleting this user.",
    requireReason: true,
    reasonLabel: "Deletion Reason",
    reasonPlaceholder: "Enter reason...",
  },
  async (reason) => {
    await deleteUser(userId, reason);
  }
);
```

### Require Type-to-Confirm

```typescript
confirm(
  {
    type: "delete",
    title: "Delete Production Database",
    description: "This will permanently delete the production database.",
    requireTypeConfirm: true,
    confirmPhrase: "DELETE PRODUCTION",
    typeConfirmInstruction: "Type DELETE PRODUCTION to confirm",
  },
  async () => {
    await deleteDatabase();
  }
);
```

## Files Already Using This Pattern

- `src/pages/admin/APIKeyManagement.tsx` - Lines 90-120 (revokeKey, deleteKey)
- `src/components/jobs/MultiLocationInput.tsx` - Line 87 (handleRemoveLocation)

## Files Needing Confirmation Dialogs

Total: ~50 files with delete/remove actions without confirmation

### High Priority
- `src/pages/admin/WebhookManagement.tsx`
- `src/pages/admin/HeadcountPlanning.tsx`
- `src/pages/admin/ExpenseTracking.tsx`
- `src/pages/crm/SuppressionList.tsx`
- `src/pages/TalentPoolListDetail.tsx`

### Component Files
- `src/components/partner/EditJobDialog.tsx`
- `src/components/partner/EditJobSheet.tsx`
- `src/components/partner/TargetCompanyDialog.tsx`
- `src/components/companies/CompanyMembersDialog.tsx`
- `src/components/companies/CompanyOfficeManager.tsx`
- `src/components/unified-tasks/TaskAttachments.tsx`
- `src/components/unified-tasks/TaskTemplates.tsx`
- `src/components/feed/PostCard.tsx`
- `src/components/analytics/SavedReportsList.tsx`
- `src/components/contracts/ContractDocumentsList.tsx`

### Full List (50 files)
See grep results: `grep -r "onClick.*delete\|onClick.*remove\|handleDelete\|handleRemove" src/`

## Implementation Checklist

For each file:
- [ ] Add import: `import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";`
- [ ] Initialize hook: `const { confirm, Dialog } = useConfirmDialog();`
- [ ] Wrap delete/remove handlers with `confirm(options, callback)`
- [ ] Add `<Dialog />` component to JSX return
- [ ] Test the confirmation flow
- [ ] Verify TypeScript compiles: `npx tsc --noEmit`

## Migration Script Approach

Due to the variety of delete/remove patterns (direct onClick, handler functions, async/sync), manual migration is recommended for each file to ensure correctness.

## Testing

After implementation:
1. Trigger the delete/remove action
2. Verify confirmation dialog appears
3. Click "Cancel" - action should NOT execute
4. Click confirm button - action should execute
5. Verify proper error handling if action fails
