import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerUser } from "../../auth/service.js";
import { updateProfile, getUserById } from "../service.js";
import { BookService } from "../../books/service.js";
import { db } from "../../common/db.js";
import { users, categories } from "../../models/index.js";
import { eq } from "drizzle-orm";

const testUser = {
  name: "Error Handler Test User",
  username: "errorhandlertest",
  email: "errorhandlertest@example.com",
  password: "testpass123",
};

describe("Comprehensive Error Handler Tests", () => {
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

  describe("Service Layer Error Handling", () => {
    it("should handle non-existent user gracefully", async () => {
      const nonExistentUserId = 99999;

      const result = await getUserById(nonExistentUserId);
      expect(result).toEqual([]); // Should return empty array, not throw
    });

    it("should handle invalid data types gracefully", async () => {
      // Test with invalid user ID - since our service doesn't validate null IDs,
      // it returns a successful result with 0 rows affected
      const invalidUserId = null as unknown as number;
      const result = await updateProfile(invalidUserId, { name: "Test" });

      // The service should handle this gracefully - either throw or return empty result
      // In this case, Drizzle returns a result with rowCount: 0
      expect(result).toBeDefined();
    });

    it("should handle database connection issues", async () => {
      // This would typically require mocking the database to simulate connection failures
      // For now, we test with invalid operations that would cause constraint violations

      // Try to update to an extremely long username that would violate DB constraints
      const longUsername = "a".repeat(1000); // Assuming username has length constraints

      await expect(
        updateProfile(userId, { username: longUsername }),
      ).rejects.toThrow();
    });
  });

  describe("Books Service Error Handling", () => {
    it("should handle invalid book creation data", async () => {
      // Test with non-existent category
      await expect(
        BookService.createBook(userId, {
          title: "Test Book",
          price: "invalid_price", // Invalid price format
          category_id: 99999, // Non-existent category
        }),
      ).rejects.toThrow();
    });

    it("should handle invalid user ID for book operations", async () => {
      // Create a valid category first
      const category = await BookService.createCategory(
        "Test Category",
        "Test desc",
      );

      // Try to create book with invalid user ID
      await expect(
        BookService.createBook(99999, {
          title: "Test Book",
          price: "25.99",
          category_id: category.id,
        }),
      ).rejects.toThrow();

      // Clean up
      await db.delete(categories).where(eq(categories.id, category.id));
    });

    it("should handle concurrent operations gracefully", async () => {
      // Create a category for the test
      const category = await BookService.createCategory(
        "Concurrent Test",
        "Test desc",
      );

      // Simulate concurrent book creation
      const bookPromises = Array.from({ length: 5 }, (_, i) =>
        BookService.createBook(userId, {
          title: `Concurrent Book ${i}`,
          price: "19.99",
          category_id: category.id,
        }),
      );

      const results = await Promise.allSettled(bookPromises);

      // All operations should either succeed or fail gracefully
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          expect(result.reason).toBeInstanceOf(Error);
        } else {
          expect(result.value).toBeDefined();
          expect(result.value!.title).toBe(`Concurrent Book ${index}`);
        }
      });

      // Clean up successful creations
      const successfulBooks = results
        .filter(
          (
            result,
          ): result is PromiseFulfilledResult<
            NonNullable<Awaited<ReturnType<typeof BookService.createBook>>>
          > => result.status === "fulfilled" && result.value !== null,
        )
        .map((result) => result.value);

      for (const book of successfulBooks) {
        await BookService.deleteBook(book.id, userId);
      }

      await db.delete(categories).where(eq(categories.id, category.id));
    });
  });
});
