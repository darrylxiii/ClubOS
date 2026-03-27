# Wave 2 - Form Accessibility (aria-describedby) Guide

## Status: Base Components Complete ✅

Both form component systems already implement proper `aria-describedby`:

### 1. Simple Forms (form-field.tsx)

**Location**: `src/components/ui/form-field.tsx`

**Features**:
- Automatic `aria-describedby` linking to error/hint messages (line 37)
- Automatic `aria-invalid` on errors (line 38)
- Screen reader announcements for errors (role="alert" on error messages)
- Required field indication (visual + screen reader)

**Usage**:
```tsx
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

<FormField
  label="Email"
  hint="We'll never share your email"
  error={errors.email}
  required
>
  <Input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</FormField>
```

### 2. React Hook Form (form.tsx)

**Location**: `src/components/ui/form.tsx`

**Features**:
- Automatic `aria-describedby` linking (line 93)
- Links both description AND error messages when error exists
- Automatic `aria-invalid` (line 94)
- Integration with react-hook-form validation

**Usage**:
```tsx
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";

const form = useForm({
  defaultValues: { email: "" }
});

<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    rules={{ required: "Email is required" }}
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} type="email" />
        </FormControl>
        <FormDescription>We'll never share your email</FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

## Migration Needed

**Problem**: Many forms use raw Input components without FormField/FormControl wrappers.

**Files needing migration**: ~100 forms (grep: `<form` without `FormField|FormControl`)

### Example: Before (Not Accessible)

```tsx
<form onSubmit={handleSubmit}>
  <Label>Email</Label>
  <Input
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
  {error && <p className="text-destructive">{error}</p>}
</form>
```

**Issues**:
- No `aria-describedby` linking error to input
- No `aria-invalid` on error state
- Screen reader doesn't announce error

### Example: After (Accessible)

```tsx
<form onSubmit={handleSubmit}>
  <FormField
    label="Email"
    error={error}
    required
  >
    <Input
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />
  </FormField>
</form>
```

## Textarea Enhancement

**Issue**: `textarea.tsx` doesn't support error/success props like `input.tsx` does.

**Recommendation**: Add error/success props to Textarea component:

```tsx
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, success, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // ... base classes
          error && "border-destructive/60 focus-visible:ring-destructive",
          success && "border-success/60 focus-visible:ring-success",
          className
        )}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    );
  }
);
```

## High Priority Forms for Migration

Based on user-facing importance:
1. `src/components/booking/BookingForm.tsx` - User booking flow
2. `src/components/ReferralDialog.tsx` - Referral submission
3. `src/components/auth/SetPasswordModal.tsx` - Authentication
4. `src/components/academy/CreateCourseDialog.tsx` - Content creation
5. `src/pages/Auth.tsx` - Login flow

## Testing

After migration:
1. Use screen reader (VoiceOver on Mac: Cmd+F5)
2. Tab to input field
3. Trigger validation error
4. Verify screen reader announces:
   - Field label
   - Error message
   - "Invalid entry" status
5. Check browser DevTools: input should have `aria-describedby` and `aria-invalid` attributes

## WCAG 2.1 Compliance

These changes achieve:
- **3.3.1 Error Identification (Level A)**: Errors are programmatically associated with inputs
- **3.3.2 Labels or Instructions (Level A)**: All inputs have proper labels
- **4.1.3 Status Messages (Level AA)**: Error messages use role="alert" for announcements
