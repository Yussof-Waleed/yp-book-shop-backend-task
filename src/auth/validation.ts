import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .regex(
      /^[a-zA-Z\s\-'.]+$/,
      "Name can only contain letters, spaces, hyphens, apostrophes, and periods",
    ),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username cannot exceed 32 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  email: z
    .string()
    .email("Invalid email format")
    .max(255, "Email cannot exceed 255 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(64, "Password cannot exceed 64 characters"),
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Username or email is required")
    .max(255, "Identifier cannot exceed 255 characters"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .max(255, "Email cannot exceed 255 characters"),
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .max(255, "Email cannot exceed 255 characters"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 characters")
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(64, "Password cannot exceed 64 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
