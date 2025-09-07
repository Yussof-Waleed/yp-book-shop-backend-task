import { z } from "zod";

// Environment variables validation schema
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse({
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgres://postgres:postgres@localhost:5432/books_shop",
      REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
      JWT_SECRET:
        process.env.JWT_SECRET ||
        (() => {
          const defaultSecret =
            "development-secret-key-change-in-production-minimum-32-chars";
          if (process.env.NODE_ENV === "production") {
            throw new Error("JWT_SECRET is required in production");
          }
          return defaultSecret;
        })(),
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
    });
  } catch (error) {
    console.error("❌ Environment validation failed:");
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
    }

    // Don't exit in test environment to avoid breaking tests
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

// Centralized environment config with validation
export const env = parseEnv();
