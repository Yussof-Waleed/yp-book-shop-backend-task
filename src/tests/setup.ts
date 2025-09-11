import dotenv from "dotenv";

// Load environment variables IMMEDIATELY before anything else
// This must happen BEFORE any modules that initialize database connections
dotenv.config({ path: ".env.local", override: true });

// Verify critical environment variables are loaded
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found in environment variables");
}

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL not found in environment variables");
}

console.log("Test environment loaded successfully");
console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("REDIS_URL:", process.env.REDIS_URL);
