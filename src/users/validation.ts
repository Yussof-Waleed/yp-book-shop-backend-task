import { z } from "zod";

export const editProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .regex(
        /^[a-zA-Z\s\-'.]+$/,
        "Name can only contain letters, spaces, hyphens, apostrophes, and periods",
      )
      .optional(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(32, "Username cannot exceed 32 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      )
      .optional(),
    email: z
      .string()
      .email("Invalid email format")
      .max(255, "Email cannot exceed 255 characters")
      .optional(),
  })
  .refine((data) => data.name || data.username || data.email, {
    message: "At least one field (name, username, or email) must be provided",
  });

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(64, "New password cannot exceed 64 characters"),
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type EditProfileInput = z.infer<typeof editProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
