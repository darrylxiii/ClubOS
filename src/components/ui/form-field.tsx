import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  success?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Compound component for form fields with label, error, success, and hint states.
 * Automatically passes error/success props to child Input components.
 */
export function FormField({
  label,
  error,
  success,
  hint,
  required,
  className,
  children,
}: FormFieldProps) {
  const id = React.useId();
  
  // Clone children and inject error/success props if they accept them
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        error: !!error,
        success: !!success,
        id,
        "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
        "aria-invalid": !!error,
      });
    }
    return child;
  });

  return (
    <div className={cn("space-y-2", className)}>
      <Label 
        htmlFor={id} 
        className={cn(
          "text-sm font-medium",
          error && "text-destructive"
        )}
      >
        {label}
        {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(required)</span>}
      </Label>
      
      {enhancedChildren}
      
      {hint && !error && !success && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      
      {success && !error && (
        <p className="text-xs text-success">
          {success}
        </p>
      )}
    </div>
  );
}

/**
 * Wrapper for form sections with title and description
 */
interface FormSectionProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormSection({ title, description, className, children }: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
