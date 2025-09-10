import { defineConfig } from "drizzle-kit";

// Drizzle ORM config
export default defineConfig({
  schema: ["./src/models/user.ts", "./src/models/book.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
