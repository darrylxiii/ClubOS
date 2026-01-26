import React, { useState, useCallback, useMemo } from "react";
import { z } from "zod";

const fieldSchemas = {
  contact_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
  
  contact_email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  
  company_name: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name is too long"),
  
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  
  industry: z
    .string()
    .min(1, "Please select an industry"),
  
  company_size: z
    .string()
    .min(1, "Please select company size"),
  
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description is too long"),
  
  estimated_roles_per_year: z
    .string()
    .refine((val) => !val || !isNaN(Number(val)), "Must be a number")
    .refine((val) => !val || Number(val) >= 0, "Must be a positive number"),
  
  phoneNumber: z
    .string()
    .min(8, "Phone number is too short")
    .regex(/^\+[1-9]\d{1,14}$/, "Please include country code"),
};

type FieldName = keyof typeof fieldSchemas;

interface UseFormValidationReturn {
  errors: Record<string, string | undefined>;
  validateField: (field: FieldName, value: string) => boolean;
  validateFields: (fields: Partial<Record<FieldName, string>>) => boolean;
  clearError: (field: FieldName) => void;
  clearAllErrors: () => void;
  getFieldError: (field: FieldName) => string | undefined;
  hasError: (field: FieldName) => boolean;
  isValid: boolean;
}

export function useFormValidation(): UseFormValidationReturn {
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const validateField = useCallback((field: FieldName, value: string): boolean => {
    const schema = fieldSchemas[field];
    if (!schema) return true;

    const result = schema.safeParse(value);
    
    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || "Invalid value";
      setErrors((prev) => ({ ...prev, [field]: errorMessage }));
      return false;
    }
    
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    return true;
  }, []);

  const validateFields = useCallback(
    (fields: Partial<Record<FieldName, string>>): boolean => {
      let allValid = true;
      const newErrors: Record<string, string | undefined> = {};

      for (const [field, value] of Object.entries(fields)) {
        const schema = fieldSchemas[field as FieldName];
        if (!schema) continue;

        const result = schema.safeParse(value);
        if (!result.success) {
          newErrors[field] = result.error.errors[0]?.message || "Invalid value";
          allValid = false;
        }
      }

      setErrors((prev) => ({ ...prev, ...newErrors }));
      return allValid;
    },
    []
  );

  const clearError = useCallback((field: FieldName) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const getFieldError = useCallback(
    (field: FieldName): string | undefined => errors[field],
    [errors]
  );

  const hasError = useCallback(
    (field: FieldName): boolean => !!errors[field],
    [errors]
  );

  const isValid = useMemo(
    () => Object.values(errors).every((e) => !e),
    [errors]
  );

  return {
    errors,
    validateField,
    validateFields,
    clearError,
    clearAllErrors,
    getFieldError,
    hasError,
    isValid,
  };
}

export function FieldError({ error }: { error?: string }): React.ReactElement | null {
  if (!error) return null;
  return React.createElement("p", {
    className: "text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1"
  }, error);
}