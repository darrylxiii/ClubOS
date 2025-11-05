import { z } from "zod";

/**
 * Zod validation schemas for booking flow
 * Comprehensive validation with specific error messages
 */

export const bookingFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase(),
  
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]+$/, "Phone number can only contain digits, spaces, parentheses, hyphens, and + symbol")
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  
  notes: z
    .string()
    .trim()
    .max(1000, "Notes must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;

export const timeSlotSchema = z.object({
  selectedDate: z.date({
    required_error: "Please select a date",
    invalid_type_error: "Invalid date format",
  }),
  selectedTime: z
    .string()
    .min(1, "Please select a time slot")
    .regex(/^\d{1,2}:\d{2}\s?(AM|PM|am|pm)$/, "Invalid time format"),
});

export type TimeSlotData = z.infer<typeof timeSlotSchema>;
