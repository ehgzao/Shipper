import { z } from "zod";

// URL validation - optional but must be valid format if provided
const optionalUrl = z.string().max(500, "URL deve ter no máximo 500 caracteres").refine(
  (val) => !val || val.startsWith("http://") || val.startsWith("https://"),
  "URL deve começar com http:// ou https://"
).optional().or(z.literal(""));

// Common text field limits
const shortText = z.string().max(100, "Máximo de 100 caracteres").trim();
const mediumText = z.string().max(255, "Máximo de 255 caracteres").trim();
const longText = z.string().max(2000, "Máximo de 2000 caracteres").trim();

// Login form validation
export const loginSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email deve ter no máximo 255 caracteres"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Signup form validation
export const signupSchema = z.object({
  name: mediumText.min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").max(255, "Email deve ter no máximo 255 caracteres"),
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

export type SignupFormData = z.infer<typeof signupSchema>;

// Opportunity form validation
export const opportunitySchema = z.object({
  companyName: shortText.min(1, "Empresa é obrigatória"),
  roleTitle: shortText.min(1, "Cargo é obrigatório"),
  jobUrl: optionalUrl,
  location: mediumText.optional().or(z.literal("")),
  salaryRange: shortText.optional().or(z.literal("")),
  contactName: shortText.optional().or(z.literal("")),
  contactLinkedin: optionalUrl,
  nextAction: mediumText.optional().or(z.literal("")),
  notes: longText.optional().or(z.literal("")),
  tags: z.array(z.string().max(50, "Tag deve ter no máximo 50 caracteres")).max(20, "Máximo de 20 tags"),
});

export type OpportunityFormData = z.infer<typeof opportunitySchema>;

// Profile settings validation
export const profileSettingsSchema = z.object({
  fullName: mediumText.optional().or(z.literal("")),
  yearsTotal: z.number().min(0, "Deve ser maior ou igual a 0").max(50, "Máximo de 50 anos"),
  yearsProduct: z.number().min(0, "Deve ser maior ou igual a 0").max(50, "Máximo de 50 anos"),
  targetRoles: z.array(z.string().max(100, "Cargo deve ter no máximo 100 caracteres")).max(20, "Máximo de 20 cargos"),
});

export type ProfileSettingsFormData = z.infer<typeof profileSettingsSchema>;

// Password change validation
export const passwordChangeSchema = z.object({
  newPassword: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

// Helper function to validate and get errors - returns string error message or null
export function getValidationError<T>(schema: z.ZodSchema<T>, data: unknown): string | null {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return null;
  }
  
  return result.error.errors[0]?.message || "Erro de validação";
}
