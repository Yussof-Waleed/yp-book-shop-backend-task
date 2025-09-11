import { z } from "zod";

// Get my books query parameters validation schema
export const getMyBooksQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .default("1")
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, "Page must be greater than 0"),
    limit: z
      .string()
      .optional()
      .default("10")
      .transform((val) => parseInt(val, 10))
      .refine(
        (val) => val > 0 && val <= 100,
        "Limit must be between 1 and 100",
      ),
    search: z
      .string()
      .trim()
      .min(1, "Search term cannot be empty")
      .max(100, "Search term cannot exceed 100 characters")
      .optional(),
    sort: z
      .enum([
        "title_asc",
        "title_desc",
        "price_asc",
        "price_desc",
        "created_asc",
        "created_desc",
      ])
      .optional()
      .default("created_desc"),
    category: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0, "Invalid category ID format")
      .optional(),
    tags: z
      .string()
      .transform((val) =>
        val
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      )
      .refine(
        (tags) => tags.every((tag) => tag.length > 0),
        "Tag names cannot be empty",
      )
      .optional(),
    minPrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .refine(
        (val) => val === undefined || val >= 0,
        "Minimum price cannot be negative",
      ),
    maxPrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .refine(
        (val) => val === undefined || val >= 0,
        "Maximum price cannot be negative",
      ),
  })
  .refine(
    (data) => {
      if (data.minPrice && data.maxPrice) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    {
      message: "Minimum price cannot be greater than maximum price",
      path: ["minPrice"],
    },
  );

// Create book validation schema
export const createBookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),
  price: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0,
      "Price must be a positive number",
    )
    .refine(
      (val) => /^\d+(\.\d{1,2})?$/.test(val),
      "Price can have at most 2 decimal places",
    ),
  category_id: z
    .number()
    .int()
    .positive("Category ID must be a positive integer"),
  thumbnail: z
    .string()
    .url("Invalid thumbnail URL format")
    .max(500, "Thumbnail URL cannot exceed 500 characters")
    .optional(),
  tags: z
    .array(
      z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => !isNaN(val) && val > 0, "Invalid tag ID format"),
    )
    .max(10, "Cannot assign more than 10 tags")
    .optional()
    .default([]),
});

// Update book validation schema
export const updateBookSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(255, "Title cannot exceed 255 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .min(1, "Description cannot be empty")
      .max(2000, "Description cannot exceed 2000 characters")
      .optional(),
    price: z
      .string()
      .refine(
        (val) => !isNaN(Number(val)) && Number(val) >= 0,
        "Price must be a positive number",
      )
      .refine(
        (val) => /^\d+(\.\d{1,2})?$/.test(val),
        "Price can have at most 2 decimal places",
      )
      .optional(),
    category_id: z
      .number()
      .int()
      .positive("Category ID must be a positive integer")
      .optional(),
    thumbnail: z
      .string()
      .url("Invalid thumbnail URL format")
      .max(500, "Thumbnail URL cannot exceed 500 characters")
      .optional(),
    tags: z
      .array(
        z
          .string()
          .transform((val) => parseInt(val, 10))
          .refine((val) => !isNaN(val) && val > 0, "Invalid tag ID format"),
      )
      .max(10, "Cannot assign more than 10 tags")
      .optional(),
  })
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    {
      message: "At least one field must be provided for update",
    },
  );

// Book ID parameter validation schema
export const bookIdParamSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, "Invalid book ID format"),
});

// Type exports for better type safety
export type GetMyBooksQuery = z.infer<typeof getMyBooksQuerySchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type BookIdParam = z.infer<typeof bookIdParamSchema>;
