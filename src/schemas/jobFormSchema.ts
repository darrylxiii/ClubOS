import { z } from "zod";

// Location data structure with geocoordinates
export const locationDataSchema = z.object({
  displayName: z.string(),
  city: z.string().nullable(),
  country: z.string(),
  countryCode: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  formattedAddress: z.string(),
}).nullable().optional();

export type LocationData = z.infer<typeof locationDataSchema>;

export const EXPERIENCE_LEVELS = [
  "junior", "mid", "senior", "lead", "director", "vp_csuite",
] as const;

export const SENIORITY_LEVELS = [
  "junior", "mid", "senior", "lead", "director", "vp_csuite",
] as const;

export const LOCATION_TYPES = [
  "onsite", "hybrid", "remote", "flexible",
] as const;

export const URGENCY_LEVELS = [
  "immediate", "two_weeks", "one_month", "three_months", "no_rush",
] as const;

export const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Operations",
  "Finance",
  "People",
  "Legal",
  "Other",
] as const;

export const jobFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .trim()
    .max(5000, "Description must be less than 5000 characters")
    .optional()
    .or(z.literal("")),
  location: z
    .string()
    .trim()
    .min(2, "Location is required")
    .max(200, "Location must be less than 200 characters"),
  // Geocoordinate fields
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  location_city: z.string().nullable().optional(),
  location_country_code: z.string().nullable().optional(),
  location_formatted: z.string().nullable().optional(),
  // Structured location object for form handling
  locationData: locationDataSchema,
  employment_type: z.enum(["fulltime", "parttime", "contract", "freelance", "internship"]),
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
  currency: z.string().min(3).max(3),
  company_id: z.string().uuid("Please select a company"),
  is_stealth: z.boolean().default(false),
  stealth_viewers: z.array(z.string().uuid()).optional(),
  external_url: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  // New fields
  experience_level: z.enum(EXPERIENCE_LEVELS).optional().nullable(),
  seniority_level: z.enum(SENIORITY_LEVELS).optional().nullable(),
  department: z.string().optional().nullable(),
  location_type: z.enum(LOCATION_TYPES).default("onsite"),
  urgency: z.enum(URGENCY_LEVELS).optional().nullable(),
  expected_start_date: z.string().optional().nullable(),
  nice_to_have: z.array(z.string()).optional().nullable(),
  requirements: z.array(z.string()).optional().nullable(),
}).refine(
  (data) => {
    const min = data.salary_min ? parseFloat(data.salary_min) : null;
    const max = data.salary_max ? parseFloat(data.salary_max) : null;
    
    if (min !== null && max !== null) {
      return min <= max;
    }
    return true;
  },
  {
    message: "Minimum salary cannot exceed maximum salary",
    path: ["salary_max"],
  }
);

export type JobFormData = z.infer<typeof jobFormSchema>;
