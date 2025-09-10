import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  email: varchar("email", { length: 128 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 128 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
