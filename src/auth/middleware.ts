import { jwt } from "hono/jwt";
import { bearerAuth } from "hono/bearer-auth";
import { getUserFromToken, verifyJWTToken } from "./service.js";
import type { Context, Next } from "hono";
import type { JwtVariables } from "hono/jwt";
import { env } from "../common/env.js";

export type AuthVariables = JwtVariables & {
  user: {
    id: number;
    username: string;
    email: string;
    created_at: string;
  };
};

export const createJWTMiddleware = () => {
  return jwt({
    secret: env.JWT_SECRET,
  });
};

export const bearerAuthMiddleware = bearerAuth({
  verifyToken: async (token: string, c: Context) => {
    const decoded = await verifyJWTToken(token);
    if (!decoded) return false;

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

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { success: false, data: null, error: "Unauthorized: No token provided" },
      401,
    );
  }

  const token = authHeader.replace("Bearer ", "");

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

  c.set("jwtPayload", decoded);

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

  c.set("user", user);
  return next();
}
