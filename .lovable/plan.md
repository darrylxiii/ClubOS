

# Smart Receipt Scanner for Asset Creation

## Overview
Replace the clunky manual asset form with a two-step flow: upload a receipt first, let AI extract all the data, then review and submit. The dialog will start with a prominent upload zone. Once a receipt is uploaded, QUIN (via Gemini Flash) reads it and pre-fills every field it can extract.

## User Flow

1. User clicks "Add New Asset" -- the dialog opens showing a large drag-and-drop upload zone at the top
2. User drops or selects a receipt image/PDF
3. File uploads to Supabase Storage; a "Scanning receipt..." spinner appears
4. An edge function receives the file, sends it to Gemini 2.5 Flash (multimodal), and returns structured data: vendor name, invoice number, date, line items, amounts (excl. VAT), VAT amount, description
5. The form fields auto-populate with extracted values; changed fields get a subtle highlight so the user sees what was filled
6. User reviews, corrects if needed, and clicks "Create Asset"
7. Manual entry still works -- the upload step is optional; a "Skip, enter manually" link is shown

## What Gets Extracted
- **Asset Name**: from the primary line item description
- **Purchase Value (excl. VAT)**: subtotal before tax
- **VAT Amount**: tax amount
- **Purchase Date**: invoice/receipt date
- **Supplier / Vendor**: company name on the receipt
- **Invoice / Serial Number**: invoice number or reference
- **Category**: AI suggests a category based on item description (e.g., "MacBook" -> `it_hardware`)

## Technical Plan

### 1. New Edge Function: `parse-receipt`
- Accepts `{ fileUrl: string }`
- Downloads the file from the signed URL
- For PDFs: converts to base64, sends as `image_url` to Gemini (same pattern as `parse-resume`)
- For images: converts to base64, sends as `image_url`
- Uses tool calling to return structured JSON with fields: `asset_name`, `purchase_value_excl_vat`, `vat_amount`, `purchase_date`, `supplier`, `invoice_reference`, `description`, `suggested_category`
- Returns the structured data to the client

### 2. Modified: `AssetFormDialog.tsx`
- Add a receipt upload zone at the top of the dialog (before form fields) using `react-dropzone` (already installed)
- On file drop: upload to `documents` bucket, call `parse-receipt` edge function, populate form state
- Show loading state with "Powered by QUIN" text during extraction
- Highlight auto-filled fields with a subtle gold left-border
- Add "Skip, enter manually" text link below the upload zone
- Once receipt is processed (or skipped), show the existing form fields as before

### 3. Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/parse-receipt/index.ts` | Edge function: file -> Gemini -> structured receipt data |

### 4. Files to Modify
| File | Change |
|------|--------|
| `src/components/admin/inventory/AssetFormDialog.tsx` | Add receipt upload zone, AI extraction call, auto-fill logic |

### 5. No Database Changes Required
The existing `documents` storage bucket and `inventory_assets` table already support everything needed.

