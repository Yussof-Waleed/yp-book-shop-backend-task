import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { env } from "./common/env.js";

import authRoutes from "./auth/routes.js";
import userRoutes from "./users/routes.js";

const app = new Hono();

app.use("*", logger());

app.route("/auth", authRoutes);
app.route("/profile", userRoutes);

app.get("/", (c) => {
  return c.json({
    success: true,
    data: {
      message: "Book Shop API",
      version: "1.0.0",
      env: env.NODE_ENV,
    },
    error: null,
  });
});
serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`🚀 Server is running on http://localhost:${info.port}`);
    console.log(`📚 Environment: ${env.NODE_ENV}`);
  },
);
