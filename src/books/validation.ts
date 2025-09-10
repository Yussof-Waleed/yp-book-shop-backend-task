import { z } from "zod";

export const getBooksQuerySchema = z
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

export const getBookByIdParamSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, "Invalid book ID format"),
});

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(50, "Category name cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Category name can only contain letters, numbers, spaces, hyphens, and underscores",
    ),
  description: z
    .string()
    .trim()
    .max(255, "Description cannot exceed 255 characters")
    .optional(),
});

export const createTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tag name is required")
    .max(30, "Tag name cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Tag name can only contain letters, numbers, spaces, hyphens, and underscores",
    ),
});

export type GetBooksQuery = z.infer<typeof getBooksQuerySchema>;
export type GetBookByIdParam = z.infer<typeof getBookByIdParamSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
