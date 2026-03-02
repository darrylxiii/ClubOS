

# Add Optional Website Field to Partner Funnel

## Recommendation

**Website only.** A single optional field is the right call. Here is why:

- A company website gives the strategist everything needed to research the prospect (they can find LinkedIn, Instagram, and socials from there).
- Adding social handles would add 2-3 more fields for marginal value and visually clutter the form.
- The `website` field already exists in the form state (`formData.website`) and is already submitted to the database -- it just has no visible input. This is a one-field addition.

## Implementation

### File: `src/components/partner-funnel/FunnelSteps.tsx`

**Add a website input below the Industry select** (after line 549, inside the Phase B `emailCaptured` block):

```tsx
<div>
  <Label className="glass-label">Website</Label>
  <Input
    type="url"
    value={formData.website}
    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
    placeholder="yourcompany.com"
    className="glass-input"
  />
</div>
```

- No asterisk, no required validation -- purely optional.
- Placeholder is just the domain format (no `https://` prefix shown, keeps it clean).
- No `onBlur` validation needed since it is optional and the existing `website` zod schema in `useFormValidation.ts` already handles `.url().optional().or(z.literal(""))`.
- No database or edge function changes -- `website` is already persisted.

That is the only change. One field, one file.
