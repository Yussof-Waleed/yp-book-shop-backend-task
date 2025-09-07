// Drizzle ORM config
export default {
  schema: ["./src/auth/model.ts", "./src/books/model.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
