import { describe, it, expect, beforeEach, afterEach } from "vitest";
import bcrypt from "bcrypt";
import { decode } from "hono/jwt";
import {
  registerUser,
  loginUser,
  logoutUser,
  generatePasswordResetOTP,
  verifyOTPAndResetPassword,
  getUserFromToken,
  verifyJWTToken,
} from "../service.js";
import { db } from "../../common/db.js";
import { users } from "../../models/index.js";
import { eq } from "drizzle-orm";
import { redis } from "../../common/redis.js";

const testUser = {
  name: "Vitest User",
  username: "vitestuser",
  email: "vitestuser@example.com",
  password: "vitestpass123",
};

describe("Auth Service", () => {
  afterEach(async () => {
    // Clean up test users
    await db.delete(users).where(eq(users.username, testUser.username));
    await db.delete(users).where(eq(users.email, testUser.email));

    // Clean up Redis sessions and blacklisted tokens
    const keys = await redis.keys(`session:*`);
    const blacklistKeys = await redis.keys(`token:blacklist:*`);
    const otpKeys = await redis.keys(`otp:*`);

    // Delete keys individually to avoid TypeScript spread issues
    for (const key of keys) await redis.del(key);
    for (const key of blacklistKeys) await redis.del(key);
    for (const key of otpKeys) await redis.del(key);
  });

  describe("User Registration", () => {
    it("should register a user and hash password", async () => {
      const user = await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name", testUser.name);
      expect(user).toHaveProperty("username", testUser.username);
      expect(user).toHaveProperty("email", testUser.email);
      expect(user).toHaveProperty("created_at");
      expect(user).not.toHaveProperty("password_hash");

      // Verify password was actually hashed in database by querying directly
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      expect(dbUser).toHaveProperty("password_hash");
      expect(
        await bcrypt.compare(testUser.password, dbUser.password_hash),
      ).toBe(true);
    });

    it("should throw error for duplicate username", async () => {
      await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );

      await expect(
        registerUser(
          "Different User",
          testUser.username,
          "different@email.com",
          testUser.password,
        ),
      ).rejects.toThrow(); // Focus on error being thrown, not specific message
    });

    it("should throw error for duplicate email", async () => {
      await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );

      await expect(
        registerUser(
          "Different User",
          "differentuser",
          testUser.email,
          testUser.password,
        ),
      ).rejects.toThrow(); // Focus on error being thrown, not specific message
    });
  });

  describe("User Login", () => {
    beforeEach(async () => {
      await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );
    });

    it("should login with username and return JWT", async () => {
      const token = await loginUser(testUser.username, testUser.password);
      expect(typeof token).toBe("string");
      const { payload } = decode(token);
      expect(payload).toHaveProperty("userId");
    });

    it("should login with email and return JWT", async () => {
      const token = await loginUser(testUser.email, testUser.password);
      expect(typeof token).toBe("string");
      const { payload } = decode(token);
      expect(payload).toHaveProperty("userId");
    });

    it("should throw error for invalid username", async () => {
      await expect(
        loginUser("nonexistent", testUser.password),
      ).rejects.toThrow();
    });

    it("should throw error for invalid password", async () => {
      await expect(
        loginUser(testUser.username, "wrongpassword"),
      ).rejects.toThrow();
    });

    it("should throw error for invalid email", async () => {
      await expect(
        loginUser("nonexistent@email.com", testUser.password),
      ).rejects.toThrow();
    });
  });

  describe("User Logout", () => {
    beforeEach(async () => {
      await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );
    });

    it("should logout and blacklist token", async () => {
      const token = await loginUser(testUser.username, testUser.password);

      // Verify token works before logout
      const user = await getUserFromToken(token);
      expect(user).toBeTruthy();
      expect(user?.username).toBe(testUser.username);

      // Logout
      const logoutResult = await logoutUser(token);
      expect(logoutResult).toBe(true);

      // Verify token is blacklisted and doesn't work after logout
      const userAfterLogout = await getUserFromToken(token);
      expect(userAfterLogout).toBeNull();
    });

    it("should handle logout with invalid token gracefully", async () => {
      const result = await logoutUser("invalid.token.here");
      expect(result).toBe(false);
    });

    it("should handle logout with expired token gracefully", async () => {
      // This would require mocking time or creating an expired token
      // For now, we test with malformed token
      const result = await logoutUser("expired.jwt.token");
      expect(result).toBe(false);
    });
  });

  describe("JWT Token Security", () => {
    beforeEach(async () => {
      await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );
    });

    it("should verify valid JWT tokens", async () => {
      const token = await loginUser(testUser.username, testUser.password);
      const decoded = await verifyJWTToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded).toHaveProperty("userId");
      expect(decoded).toHaveProperty("iat");
      expect(decoded).toHaveProperty("exp");
    });

    it("should reject invalid JWT tokens", async () => {
      const result = await verifyJWTToken("invalid.jwt.token");
      expect(result).toBeNull();
    });

    it("should reject tampered JWT tokens", async () => {
      const token = await loginUser(testUser.username, testUser.password);
      const tamperedToken = token.slice(0, -5) + "XXXXX"; // Tamper with signature

      const result = await verifyJWTToken(tamperedToken);
      expect(result).toBeNull();
    });

    it("should check Redis session for token validation", async () => {
      const token = await loginUser(testUser.username, testUser.password);

      // Manually remove the session from Redis
      await redis.del(`session:${token}`);

      // Token should now be invalid despite being a valid JWT
      const user = await getUserFromToken(token);
      expect(user).toBeNull();
    });

    it("should reject blacklisted tokens", async () => {
      const token = await loginUser(testUser.username, testUser.password);

      // Manually blacklist the token
      await redis.set(`token:blacklist:${token}`, "1", { EX: 3600 });

      // Token should be rejected
      const decoded = await verifyJWTToken(token);
      expect(decoded).toBeNull();

      const user = await getUserFromToken(token);
      expect(user).toBeNull();
    });
  });

  describe("Password Reset", () => {
    beforeEach(async () => {
      await registerUser(
        testUser.name,
        testUser.username,
        testUser.email,
        testUser.password,
      );
    });

    it("should generate OTP for password reset", async () => {
      const otp = await generatePasswordResetOTP(testUser.email);
      expect(otp).toBe("123456");
    });

    it("should throw error for non-existent email in password reset", async () => {
      await expect(
        generatePasswordResetOTP("nonexistent@email.com"),
      ).rejects.toThrow();
    });

    it("should reset password with valid OTP", async () => {
      const otp = await generatePasswordResetOTP(testUser.email);
      const newPassword = "newpassword123";

      await verifyOTPAndResetPassword(testUser.email, otp, newPassword);

      // Verify the password was changed by attempting login
      const token = await loginUser(testUser.email, newPassword);
      expect(typeof token).toBe("string");
    });

    it("should throw error for invalid OTP", async () => {
      await generatePasswordResetOTP(testUser.email);

      await expect(
        verifyOTPAndResetPassword(testUser.email, "wrongotp", "newpassword123"),
      ).rejects.toThrow();
    });

    it("should throw error for non-existent email in reset", async () => {
      await expect(
        verifyOTPAndResetPassword(
          "nonexistent@email.com",
          "123456",
          "newpassword123",
        ),
      ).rejects.toThrow();
    });

    it("should throw error for expired OTP", async () => {
      // Generate OTP first
      const otp = await generatePasswordResetOTP(testUser.email);

      // Manually delete the OTP from Redis to simulate expiry
      await redis.del(`reset:otp:${testUser.email}`);

      // Attempt to reset password with expired OTP should fail
      await expect(
        verifyOTPAndResetPassword(testUser.email, otp, "newpassword123"),
      ).rejects.toThrow();
    });

    it("should throw error when no OTP was generated", async () => {
      // Try to reset password without generating OTP first
      await expect(
        verifyOTPAndResetPassword(testUser.email, "123456", "newpassword123"),
      ).rejects.toThrow();
    });
  });
});
