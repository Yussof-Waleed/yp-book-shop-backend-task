import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { registerUser, loginUser, logoutUser } from "../service.js";
import authRoutes from "../routes.js";
import { db } from "../../common/db.js";
import { users } from "../../models/user.js";
import { eq } from "drizzle-orm";
import { redis } from "../../common/redis.js";

const testUser = {
  name: "Controller Test User",
  username: "controllertest",
  email: "controllertest@example.com",
  password: "testpass123",
};

describe("Auth Controller Tests", () => {
  const app = new Hono();
  app.route("/auth", authRoutes);

  afterEach(async () => {
    // Clean up test users
    await db.delete(users).where(eq(users.username, testUser.username));
    await db.delete(users).where(eq(users.email, testUser.email));

    // Clean up Redis sessions and blacklisted tokens
    const keys = await redis.keys(`session:*`);
    const blacklistKeys = await redis.keys(`token:blacklist:*`);
    const otpKeys = await redis.keys(`reset:otp:*`);

    for (const key of keys) await redis.del(key);
    for (const key of blacklistKeys) await redis.del(key);
    for (const key of otpKeys) await redis.del(key);
  });

  describe("Register Controller", () => {
    it("should register user and return 201 with user data", async () => {
      const response = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: testUser.name,
          username: testUser.username,
          email: testUser.email,
          password: testUser.password,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("id");
      expect(data.data.username).toBe(testUser.username);
      expect(data.data.email).toBe(testUser.email);
      expect(data.error).toBeNull();
    });

    it("should return 400 for invalid registration data", async () => {
      const response = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: testUser.name,
          username: "ab", // Too short
          email: "invalid-email", // Invalid format
          password: "123", // Too short
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it("should return 409 for duplicate username", async () => {
      // Register user first
      await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );

      const response = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Another User",
          username: testUser.username, // Duplicate
          email: "different@email.com",
          password: testUser.password,
        }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("already taken");
    });
  });

  describe("Login Controller", () => {
    beforeEach(async () => {
      await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );
    });

    it("should login with valid credentials and return token", async () => {
      const response = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: testUser.username,
          password: testUser.password,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.data).toBe("string"); // Token
      expect(data.error).toBeNull();
    });

    it("should login with email as identifier", async () => {
      const response = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: testUser.email,
          password: testUser.password,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.data).toBe("string");
    });

    it("should return 401 for invalid credentials", async () => {
      const response = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: testUser.username,
          password: "wrongpassword",
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid credentials");
    });

    it("should return 400 for missing login data", async () => {
      const response = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: testUser.username,
          // Missing password
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe("Password Reset Controller", () => {
    beforeEach(async () => {
      await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );
    });

    it("should generate OTP for valid email", async () => {
      const response = await app.request("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.message).toContain("reset code has been sent"); // Security message
    });

    it("should reset password with valid OTP", async () => {
      // Generate OTP first
      await app.request("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testUser.email }),
      });

      const response = await app.request("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          otp: "123456",
          newPassword: "newpassword123",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should return 400 for invalid OTP", async () => {
      // Generate OTP first
      await app.request("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testUser.email }),
      });

      const response = await app.request("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          otp: "wrongotp",
          newPassword: "newpassword123",
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});

describe("Logout Behavior Tests", () => {
  afterEach(async () => {
    // Clean up test users
    await db.delete(users).where(eq(users.username, testUser.username));
    await db.delete(users).where(eq(users.email, testUser.email));

    // Clean up Redis sessions and blacklisted tokens
    const keys = await redis.keys(`session:*`);
    const blacklistKeys = await redis.keys(`token:blacklist:*`);
    const otpKeys = await redis.keys(`reset:otp:*`);

    for (const key of keys) await redis.del(key);
    for (const key of blacklistKeys) await redis.del(key);
    for (const key of otpKeys) await redis.del(key);
  });

  describe("Logout with Same Token Multiple Times", () => {
    beforeEach(async () => {
      await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );
    });

    it("should return true for first logout and false for subsequent logouts with same token", async () => {
      const token = await loginUser(testUser.username, testUser.password);

      // First logout should succeed
      const firstLogout = await logoutUser(token);
      expect(firstLogout).toBe(true);

      // Second logout with same token should fail
      const secondLogout = await logoutUser(token);
      expect(secondLogout).toBe(false);

      // Third logout with same token should also fail
      const thirdLogout = await logoutUser(token);
      expect(thirdLogout).toBe(false);
    });

    it("should return false for logout with invalid token", async () => {
      const result = await logoutUser("invalid.jwt.token");
      expect(result).toBe(false);
    });

    it("should return false for logout with malformed token", async () => {
      const result = await logoutUser("malformed");
      expect(result).toBe(false);
    });

    it("should return false for logout with empty token", async () => {
      const result = await logoutUser("");
      expect(result).toBe(false);
    });

    it("should blacklist token after successful logout", async () => {
      const token = await loginUser(testUser.username, testUser.password);

      // Logout should succeed and blacklist the token
      const logoutResult = await logoutUser(token);
      expect(logoutResult).toBe(true);

      // Check that token is blacklisted in Redis
      const blacklisted = await redis.get(`token:blacklist:${token}`);
      expect(blacklisted).toBe("1");

      // Check that session is removed
      const session = await redis.get(`session:${token}`);
      expect(session).toBeNull();
    });
  });
});
