// My Books module unit tests
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MyBooksService } from "../service.js";
import { BookService } from "../../books/service.js";
import { db } from "../../common/db.js";
import { books, categories, tags, users } from "../../models/index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

describe("My Books Service", () => {
  let testUserId: number;
  let testCategoryId: number;
  let testTagId: number;

  beforeEach(async () => {
    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        name: "Test User MyBooks",
        username: "testuser_mybooks",
        email: "testuser_mybooks@example.com",
        password_hash: await bcrypt.hash("password123", 10),
      })
      .returning();
    testUserId = testUser.id;

    // Create test category
    const testCategory = await BookService.createCategory(
      `Test Category ${Date.now()}`,
      "Test description",
    );
    testCategoryId = testCategory.id;

    // Create test tag
    const testTag = await BookService.createTag(`Test Tag ${Date.now()}`);
    testTagId = testTag.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(books).where(eq(books.author_id, testUserId));
    await db.delete(categories).where(eq(categories.id, testCategoryId));
    await db.delete(tags).where(eq(tags.id, testTagId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should create a book for the user", async () => {
    const bookData = {
      title: "My Test Book",
      description: "A test book for my collection",
      price: "29.99",
      thumbnail: "https://example.com/thumbnail.jpg",
      category_id: testCategoryId,
      tag_ids: [testTagId],
    };

    const createdBook = await MyBooksService.createUserBook(
      testUserId,
      bookData,
    );

    expect(createdBook).toBeDefined();
    expect(createdBook!.title).toBe("My Test Book");
    expect(createdBook!.author?.id).toBe(testUserId);
    expect(createdBook!.category?.id).toBe(testCategoryId);
  });

  it("should get user's books only", async () => {
    // Create a book for the test user
    await MyBooksService.createUserBook(testUserId, {
      title: "My Book 1",
      description: "First book",
      price: "19.99",
      category_id: testCategoryId,
    });

    // Create another user and their book
    const [anotherUser] = await db
      .insert(users)
      .values({
        name: "Another User",
        username: "anotheruser",
        email: "another@example.com",
        password_hash: await bcrypt.hash("password123", 10),
      })
      .returning();

    await BookService.createBook(anotherUser.id, {
      title: "Another User's Book",
      price: "15.99",
      category_id: testCategoryId,
    });

    // Get user's books - should only return the user's books
    const userBooks = await MyBooksService.getUserBooks(testUserId, {
      page: 1,
      limit: 10,
    });

    expect(userBooks.data).toHaveLength(1);
    expect(userBooks.data[0].title).toBe("My Book 1");
    // Note: author_id is not exposed in the getUserBooks response, which is correct for security

    // Clean up
    await db.delete(users).where(eq(users.id, anotherUser.id));
  });

  it("should search user's books by title", async () => {
    const timestamp = Date.now();

    // Create multiple books for the user
    await MyBooksService.createUserBook(testUserId, {
      title: `JavaScript Guide ${timestamp}`,
      price: "25.99",
      category_id: testCategoryId,
    });

    await MyBooksService.createUserBook(testUserId, {
      title: `Python Basics ${timestamp}`,
      price: "30.99",
      category_id: testCategoryId,
    });

    // Search for JavaScript books
    const searchResults = await MyBooksService.getUserBooks(testUserId, {
      page: 1,
      limit: 10,
      search: `JavaScript Guide ${timestamp}`,
    });

    expect(searchResults.data).toHaveLength(1);
    expect(searchResults.data[0].title).toContain("JavaScript Guide");
  });

  it("should update user's book", async () => {
    // Create a book
    const book = await MyBooksService.createUserBook(testUserId, {
      title: "Original Title",
      price: "20.00",
      category_id: testCategoryId,
    });

    expect(book).toBeDefined();
    if (!book) return;

    // Update the book
    const updatedBook = await MyBooksService.updateUserBook(
      book.id,
      testUserId,
      {
        title: "Updated Title",
        price: "25.00",
      },
    );

    expect(updatedBook).toBeDefined();
    expect(updatedBook!.title).toBe("Updated Title");
    expect(updatedBook!.price).toBe("25.00");
  });

  it("should delete user's book", async () => {
    // Create a book
    const book = await MyBooksService.createUserBook(testUserId, {
      title: "Book to Delete",
      price: "15.00",
      category_id: testCategoryId,
    });

    expect(book).toBeDefined();
    if (!book) return;

    // Delete the book
    const deleteResult = await MyBooksService.deleteUserBook(
      book.id,
      testUserId,
    );
    expect(deleteResult).toBe(true);

    // Verify the book is deleted
    const userBooks = await MyBooksService.getUserBooks(testUserId, {
      page: 1,
      limit: 10,
    });

    const deletedBook = userBooks.data.find((b) => b.id === book.id);
    expect(deletedBook).toBeUndefined();
  });
});
