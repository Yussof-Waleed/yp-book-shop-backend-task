// Auth middleware: uses HonoJS JWT middleware and bearer auth for token verification
import { jwt } from "hono/jwt";
import { bearerAuth } from "hono/bearer-auth";
import { getUserFromToken, verifyJWTToken } from "./service.js";
import type { Context, Next } from "hono";
import type { JwtVariables } from "hono/jwt";
import { env } from "../common/env.js";

// Types for JWT variables
export type AuthVariables = JwtVariables & {
  user: {
    id: number;
    username: string;
    email: string;
    created_at: string;
  };
};

// HonoJS JWT middleware factory - creates middleware with environment secret
export const createJWTMiddleware = () => {
  return jwt({
    secret: env.JWT_SECRET,
  });
};

// Bearer auth middleware with custom token verification using our Redis session
export const bearerAuthMiddleware = bearerAuth({
  verifyToken: async (token: string, c: Context) => {
    const decoded = await verifyJWTToken(token);
    if (!decoded) return false;

    // Set JWT payload in context for compatibility
    c.set("jwtPayload", decoded);
    return true;
  },
  invalidTokenMessage: {
    success: false,
    data: null,
    error: "Unauthorized: Invalid or expired token",
  },
  noAuthenticationHeaderMessage: {
    success: false,
    data: null,
    error: "Unauthorized: No token provided",
  },
});

// Combined auth middleware that uses bearer auth + user loading
export async function authMiddleware(c: Context, next: Next) {
  // Get token from Authorization header first
  const authHeader = c.req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { success: false, data: null, error: "Unauthorized: No token provided" },
      401,
    );
  }

  const token = authHeader.replace("Bearer ", "");

  // Verify token and get decoded payload
  const decoded = await verifyJWTToken(token);
  if (!decoded) {
    return c.json(
      {
        success: false,
        data: null,
        error: "Unauthorized: Invalid or expired token",
      },
      401,
    );
  }

  // Set JWT payload in context for compatibility
  c.set("jwtPayload", decoded);

  // Get user from token (this checks Redis session and database)
  const user = await getUserFromToken(token);
  if (!user) {
    return c.json(
      {
        success: false,
        data: null,
        error: "Unauthorized: User session not found",
      },
      401,
    );
  }

  // Set user in context
  c.set("user", user);
  return next();
}
