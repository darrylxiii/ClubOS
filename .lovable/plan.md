
# Fix Finance Hub Crash: attr-accept ESM Export Error

## Root Cause

The `vite.config.ts` has `noDiscovery: true` in `optimizeDeps`, meaning Vite will only pre-bundle dependencies explicitly listed in the `include` array. `react-dropzone` and its internal dependency `attr-accept` are missing from that list.

When the Expenses tab loads `ExpenseFormDialog.tsx`, it imports `useDropzone` from `react-dropzone`, which imports `attr-accept`. Since `attr-accept` was not pre-bundled, Vite serves it as raw ESM. The package uses a CommonJS-style default export that Vite cannot resolve, causing:

```
The requested module '.../attr-accept/dist/es/index.js' does not provide an export named 'default'
```

## The Fix

Add `react-dropzone` and `attr-accept` to the `optimizeDeps.include` array in `vite.config.ts`. This tells Vite to pre-bundle them, converting their CJS/mixed exports into clean ESM that works in the browser.

```typescript
optimizeDeps: {
  include: [
    // ... existing entries ...
    'react-dropzone',
    'attr-accept',
    'file-selector',   // another react-dropzone dependency
  ],
}
```

`file-selector` is also a `react-dropzone` dependency that may hit the same issue, so we include it proactively.

## Additional Audit: Other react-dropzone Usage

These files also import `react-dropzone` and would crash when loaded:
- `src/components/intelligence/ExternalContentImportModal.tsx`
- `src/components/admin/inventory/AssetFormDialog.tsx`
- `src/components/contracts/ContractDocumentUpload.tsx`
- `src/components/proposals/ProposalAttachmentUploader.tsx`
- `src/components/candidate-profile/AddMeetingModal.tsx`

The `optimizeDeps.include` fix resolves all of these at once -- no per-file changes needed.

## Files to Modify

| File | Change |
|---|---|
| `vite.config.ts` | Add `react-dropzone`, `attr-accept`, `file-selector` to `optimizeDeps.include` |

## Impact

- Zero UI changes
- Zero logic changes
- Fixes the crash for the Expenses tab and every other component using `react-dropzone`
- One-line config addition
