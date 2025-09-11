// Database reset and reseed script
// Drops all tables, runs migrations, and seeds with fresh data

import "dotenv/config";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function resetAndSeed() {
  try {
    console.log("🔄 Resetting database...");

    // Run migrations to ensure schema is up-to-date
    console.log("📦 Running migrations...");
    await execAsync("npm run db:migrate");
    console.log("✅ Migrations completed");

    // Run seeding script
    console.log("🌱 Starting fresh seed...");
    await execAsync("npm run db:seed");
  } catch (error) {
    console.error("❌ Error during reset and seed:", error);
    process.exit(1);
  }
}

resetAndSeed();
