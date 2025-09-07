import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerUser } from "../../auth/service.js";
import { updateProfile } from "../service.js";
import { db } from "../../common/db.js";
import { users } from "../../models/user.js";
import { eq } from "drizzle-orm";

const testUser = {
  name: "Error Handler Test User",
  username: "errorhandlertest",
  email: "errorhandlertest@example.com",
  password: "testpass123",
};

describe("Users Error Handler Integration", () => {
  let userId: number;

  beforeEach(async () => {
    // Ensure clean slate in case a previous run left residue
    await db.delete(users).where(eq(users.username, testUser.username));
    await db.delete(users).where(eq(users.email, testUser.email));

    const user = await registerUser(
      testUser.name,
      testUser.username,
      testUser.email,
      testUser.password,
    );
    userId = user.id;
  });

  afterEach(async () => {
    if (userId != null) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  describe("Database Constraint Violations", () => {
    it("should throw raw database error for duplicate username (to be handled by error handler)", async () => {
      // Create another user first
      const anotherUser = await registerUser(
        "Another User",
        "anotheruser",
        "another@email.com",
        "password123",
      );

      // Try to update to duplicate username - should throw raw database error
      await expect(
        updateProfile(userId, { username: "anotheruser" }),
      ).rejects.toThrow(); // The specific error will be handled by the centralized error handler

      // Clean up
      await db.delete(users).where(eq(users.id, anotherUser.id));
    });

    it("should throw raw database error for duplicate email (to be handled by error handler)", async () => {
      // Create another user first
      const anotherUser = await registerUser(
        "Another User",
        "anotheruser",
        "another@email.com",
        "password123",
      );

      // Try to update to duplicate email - should throw raw database error
      await expect(
        updateProfile(userId, { email: "another@email.com" }),
      ).rejects.toThrow(); // The specific error will be handled by the centralized error handler

      // Clean up
      await db.delete(users).where(eq(users.id, anotherUser.id));
    });

    it("should successfully update when no conflicts exist", async () => {
      // This should succeed without errors
      await expect(
        updateProfile(userId, {
          name: "Updated Name",
          username: "updatedusername",
          email: "updated@email.com",
        }),
      ).resolves.not.toThrow();

      // Verify the update worked
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      expect(updatedUser.name).toBe("Updated Name");
      expect(updatedUser.username).toBe("updatedusername");
      expect(updatedUser.email).toBe("updated@email.com");
    });
  });
});
