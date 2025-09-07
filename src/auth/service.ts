// Auth service: business logic for registration, login, logout
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { sign, verify } from "hono/jwt";
import { users } from "./model.js";
import { db } from "../common/db.js";
import { redis } from "../common/redis.js";
import { env } from "../common/env.js";

const JWT_EXPIRES_IN = 3600; // 1 hour in seconds
const OTP_EXPIRY = 600; // 10 minutes in seconds

export async function registerUser(
  name: string,
  username: string,
  email: string,
  password: string,
) {
  const password_hash = await bcrypt.hash(password, 10);

  // Let database constraints handle uniqueness validation
  // This is more efficient as it avoids race conditions and extra queries
  const [user] = await db
    .insert(users)
    .values({ name, username, email, password_hash })
    .returning({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      created_at: users.created_at,
    });
  return user;
}

export async function loginUser(identifier: string, password: string) {
  let user = await db
    .select()
    .from(users)
    .where(eq(users.email, identifier))
    .limit(1);
  if (!user.length) {
    user = await db
      .select()
      .from(users)
      .where(eq(users.username, identifier))
      .limit(1);
  }
  if (!user.length) throw new Error("Invalid credentials");
  const valid = await bcrypt.compare(password, user[0].password_hash);
  if (!valid) throw new Error("Invalid credentials");

  // Create JWT payload with expiry
  const payload = {
    userId: user[0].id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN,
  };

  const token = await sign(payload, env.JWT_SECRET);
  await redis.set(`session:${token}`, String(user[0].id), {
    EX: JWT_EXPIRES_IN,
  });
  return token;
}

export async function logoutUser(token: string) {
  try {
    // First check if token is already blacklisted
    const blacklisted = await redis.get(`token:blacklist:${token}`);
    if (blacklisted) {
      return false; // Token already logged out
    }

    const decoded = (await verify(token, env.JWT_SECRET)) as {
      userId: number;
      exp: number;
    };
    if (decoded) {
      // Store the token in Redis blacklist with expiry matching JWT expiration
      const expiry = Math.floor(decoded.exp - Date.now() / 1000);
      if (expiry > 0) {
        await redis.set(`token:blacklist:${token}`, "1", { EX: expiry });
      }
      // Also remove from active sessions
      await redis.del(`session:${token}`);
      return true;
    }
  } catch {
    // Token is invalid or expired, no need to blacklist
    return false;
  }
  return false;
}

export async function findUserByEmail(email: string) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user.length) {
    return null;
  }
  return user[0];
}

export async function generatePasswordResetOTP(email: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  // For demo purposes, we'll always return 123456
  // In production, generate a random OTP and send via email
  const otp = "123456";
  console.log(`Generated OTP for password reset: ${otp} for email: ${email}`);

  // Store OTP in Redis with expiry
  await redis.set(`reset:otp:${email}`, otp, { EX: OTP_EXPIRY });

  return otp;
}

export async function verifyOTPAndResetPassword(
  email: string,
  otp: string,
  newPassword: string,
) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  const storedOTP = await redis.get(`reset:otp:${email}`);

  // Check if OTP exists and is still valid (not expired)
  if (!storedOTP) {
    throw new Error("Invalid or expired OTP");
  }

  // Verify OTP matches
  if (otp !== storedOTP) {
    throw new Error("Invalid or expired OTP");
  }

  // Reset the password
  const password_hash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ password_hash }).where(eq(users.id, user.id));

  // Delete OTP after successful reset
  await redis.del(`reset:otp:${email}`);

  return true;
}

export async function getUserFromToken(token: string) {
  try {
    // First check if token is blacklisted
    const blacklisted = await redis.get(`token:blacklist:${token}`);
    if (blacklisted) return null;

    // Verify the JWT token
    const decoded = (await verify(token, env.JWT_SECRET)) as { userId: number };
    if (!decoded?.userId) return null;

    // Check if session exists in Redis
    const userId = await redis.get(`session:${token}`);
    if (!userId) return null;

    // Get user from database
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);
    return user[0] || null;
  } catch {
    return null;
  }
}

export async function verifyJWTToken(token: string) {
  try {
    // First check if token is blacklisted
    const blacklisted = await redis.get(`token:blacklist:${token}`);
    if (blacklisted) return null;

    // Verify the JWT token
    const decoded = (await verify(token, env.JWT_SECRET)) as { userId: number };
    return decoded;
  } catch {
    return null;
  }
}
