import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerUser, loginUser, logoutUser } from "../service.js";
import { db } from "../../common/db.js";
import { users } from "../../models/user.js";
import { eq } from "drizzle-orm";
import { redis } from "../../common/redis.js";

const testUser = {
  name: "Logout Behavior Test User",
  username: "logouttest",
  email: "logouttest@example.com",
  password: "testpass123",
};

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
