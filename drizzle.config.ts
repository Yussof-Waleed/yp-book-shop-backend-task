// Drizzle ORM config
export default {
  schema: ["./src/models/user.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
