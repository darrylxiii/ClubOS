import { z } from "zod";

export const jobFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters"),
  location: z
    .string()
    .trim()
    .min(2, "Location is required")
    .max(200, "Location must be less than 200 characters"),
  employment_type: z.enum(["fulltime", "parttime", "contract", "freelance", "internship"]),
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
  currency: z.string().min(3).max(3),
  company_id: z.string().uuid("Please select a company"),
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
