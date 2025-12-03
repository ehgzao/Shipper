import { z } from "zod";

// URL validation - optional but must be valid format if provided
const optionalUrl = z.string().max(500, "URL must be at most 500 characters").refine(
  (val) => !val || val.startsWith("http://") || val.startsWith("https://"),
  "URL must start with http:// or https://"
).optional().or(z.literal(""));

// Common text field limits
const shortText = z.string().max(100, "Maximum 100 characters").trim();
const mediumText = z.string().max(255, "Maximum 255 characters").trim();
const longText = z.string().max(2000, "Maximum 2000 characters").trim();

// Login form validation
export const loginSchema = z.object({
  email: z.string().email("Invalid email").max(255, "Email must be at most 255 characters"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Signup form validation
export const signupSchema = z.object({
  name: mediumText.min(1, "Name is required"),
  email: z.string().email("Invalid email").max(255, "Email must be at most 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignupFormData = z.infer<typeof signupSchema>;

// Opportunity form validation
export const opportunitySchema = z.object({
  companyName: shortText.min(1, "Company is required"),
  roleTitle: shortText.min(1, "Role is required"),
  jobUrl: optionalUrl,
  location: mediumText.optional().or(z.literal("")),
  salaryRange: shortText.optional().or(z.literal("")),
  contactName: shortText.optional().or(z.literal("")),
  contactLinkedin: optionalUrl,
  nextAction: mediumText.optional().or(z.literal("")),
  notes: longText.optional().or(z.literal("")),
  tags: z.array(z.string().max(50, "Tag must be at most 50 characters")).max(20, "Maximum 20 tags"),
});

export type OpportunityFormData = z.infer<typeof opportunitySchema>;

// Profile settings validation
export const profileSettingsSchema = z.object({
  fullName: mediumText.optional().or(z.literal("")),
  yearsTotal: z.number().min(0, "Must be greater than or equal to 0").max(50, "Maximum 50 years"),
  yearsProduct: z.number().min(0, "Must be greater than or equal to 0").max(50, "Maximum 50 years"),
  targetRoles: z.array(z.string().max(100, "Role must be at most 100 characters")).max(20, "Maximum 20 roles"),
});

export type ProfileSettingsFormData = z.infer<typeof profileSettingsSchema>;

// Password change validation
export const passwordChangeSchema = z.object({
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

// Helper function to validate and get errors - returns string error message or null
export function getValidationError<T>(schema: z.ZodSchema<T>, data: unknown): string | null {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return null;
  }
  
  return result.error.errors[0]?.message || "Validation error";
}