import { describe, it, expect, beforeEach, afterEach } from "vitest";
import bcrypt from "bcrypt";
import {
  getUserById,
  getUserWithPasswordById,
  updateProfile,
  changePassword,
  resetPassword,
} from "../service.js";
import { registerUser } from "../../auth/service.js";
import { db } from "../../common/db.js";
import { users } from "../../models/user.js";
import { eq } from "drizzle-orm";

const testUser = {
  name: "Profile User",
  username: "profileuser",
  email: "profileuser@example.com",
  password: "originalpass123",
};

describe("User Profile Service", () => {
  let userId: number;

  beforeEach(async () => {
    const user = await registerUser(
      testUser.name,
      testUser.username,
      testUser.email,
      testUser.password,
    );
    userId = user.id;
  });

  afterEach(async () => {
    await db.delete(users).where(eq(users.id, userId));
  });

  describe("Get User Profile", () => {
    it("should get user by id", async () => {
      const user = await getUserById(userId);
      expect(user[0]).toHaveProperty("id");
      expect(user[0].name).toBe(testUser.name);
      expect(user[0].username).toBe(testUser.username);
      expect(user[0].email).toBe(testUser.email);
    });

    it("should return empty array for non-existent user", async () => {
      const user = await getUserById(99999);
      expect(user).toHaveLength(0);
    });
  });

  describe("Update Profile", () => {
    it("should update profile with new username and email", async () => {
      const uniqueName = `newname_${Date.now()}`;
      const uniqueEmail = `newemail_${Date.now()}@example.com`;

      await updateProfile(userId, { username: uniqueName, email: uniqueEmail });
      const user = await getUserById(userId);
      expect(user[0].username).toBe(uniqueName);
      expect(user[0].email).toBe(uniqueEmail);
    });

    it("should update only username", async () => {
      const uniqueName = `onlyname_${Date.now()}`;

      await updateProfile(userId, { username: uniqueName });
      const user = await getUserById(userId);
      expect(user[0].username).toBe(uniqueName);
      expect(user[0].email).toBe(testUser.email);
    });

    it("should update only email", async () => {
      const uniqueEmail = `onlyemail_${Date.now()}@example.com`;

      await updateProfile(userId, { email: uniqueEmail });
      const user = await getUserById(userId);
      expect(user[0].username).toBe(testUser.username);
      expect(user[0].email).toBe(uniqueEmail);
    });

    it("should update only name", async () => {
      const newName = "Updated Name";

      await updateProfile(userId, { name: newName });
      const user = await getUserById(userId);
      expect(user[0].name).toBe(newName);
      expect(user[0].username).toBe(testUser.username);
      expect(user[0].email).toBe(testUser.email);
    });

    it("should throw error when updating to duplicate username", async () => {
      // Create another user
      const anotherUser = await registerUser(
        "Another User",
        "anotheruser",
        "another@email.com",
        "password123",
      );

      await expect(
        updateProfile(userId, {
          username: "anotheruser",
          email: "newemail@example.com",
        }),
      ).rejects.toThrow();

      // Clean up
      await db.delete(users).where(eq(users.id, anotherUser.id));
    });

    it("should throw error when updating to duplicate email", async () => {
      // Create another user
      const anotherUser = await registerUser(
        "Another User",
        "anotheruser",
        "another@email.com",
        "password123",
      );

      await expect(
        updateProfile(userId, {
          username: "newusername",
          email: "another@email.com",
        }),
      ).rejects.toThrow();

      // Clean up
      await db.delete(users).where(eq(users.id, anotherUser.id));
    });
  });

  describe("Change Password", () => {
    it("should change password with valid old password", async () => {
      const newPassword = "newpass456";
      await changePassword(userId, testUser.password, newPassword);

      // Verify password was changed
      const user = await getUserWithPasswordById(userId);
      const isValidNew = await bcrypt.compare(
        newPassword,
        user[0].password_hash,
      );
      expect(isValidNew).toBe(true);

      const isValidOld = await bcrypt.compare(
        testUser.password,
        user[0].password_hash,
      );
      expect(isValidOld).toBe(false);
    });

    it("should throw error with invalid old password", async () => {
      await expect(
        changePassword(userId, "wrongoldpass", "newpass456"),
      ).rejects.toThrow();
    });

    it("should throw error for non-existent user", async () => {
      await expect(
        changePassword(99999, testUser.password, "newpass456"),
      ).rejects.toThrow();
    });
  });

  describe("Reset Password", () => {
    it("should reset password successfully", async () => {
      const newPassword = "resetpass789";
      await resetPassword(userId, newPassword);

      // Verify password was reset
      const user = await getUserWithPasswordById(userId);
      const isValidNew = await bcrypt.compare(
        newPassword,
        user[0].password_hash,
      );
      expect(isValidNew).toBe(true);

      const isValidOld = await bcrypt.compare(
        testUser.password,
        user[0].password_hash,
      );
      expect(isValidOld).toBe(false);
    });

    it("should throw error for non-existent user", async () => {
      await expect(resetPassword(99999, "newpass456")).rejects.toThrow();
    });
  });
});
