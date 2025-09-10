// Books module unit tests
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BookService } from "../service.js";
import { db } from "../../common/db.js";
import { books, categories, tags, users } from "../../models/index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

describe("Books Service", () => {
  let testUserId: number;
  let testCategoryId: number;
  let testTagId: number;
  let testBookId: number;

  beforeEach(async () => {
    // Create test user with unique username
    const timestamp = Date.now();
    const [testUser] = await db
      .insert(users)
      .values({
        name: "Test User Books",
        username: `testuser_books_${timestamp}`,
        email: `testuser_books_${timestamp}@example.com`,
        password_hash: await bcrypt.hash("password123", 10),
      })
      .returning();
    testUserId = testUser.id;

    // Create test category
    const testCategory = await BookService.createCategory(
      "Test Category",
      "Test description",
    );
    testCategoryId = testCategory.id;

    // Create test tag
    const testTag = await BookService.createTag("Test Tag");
    testTagId = testTag.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(books).where(eq(books.author_id, testUserId));
    await db.delete(categories).where(eq(categories.id, testCategoryId));
    await db.delete(tags).where(eq(tags.id, testTagId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should create a new book", async () => {
    const bookData = {
      title: "Test Book",
      description: "A test book description",
      price: "29.99",
      thumbnail: "https://example.com/thumbnail.jpg",
      category_id: testCategoryId,
      tag_ids: [testTagId],
    };

    const createdBook = await BookService.createBook(testUserId, bookData);

    expect(createdBook).toBeDefined();
    expect(createdBook).not.toBeNull();

    if (!createdBook) {
      throw new Error("Failed to create book");
    }

    expect(createdBook.title).toBe("Test Book");
    expect(createdBook.price).toBe("29.99");
    expect(createdBook.author?.id).toBe(testUserId);
    expect(createdBook.category?.id).toBe(testCategoryId);
    expect(createdBook.tags).toHaveLength(1);
    expect(createdBook.tags[0]?.id).toBe(testTagId);

    testBookId = createdBook.id;
  });

  it("should get all books with pagination", async () => {
    // Create a test book with a title that should appear first alphabetically
    const timestamp = Date.now();
    const bookData = {
      title: `AAA Test Book ${timestamp}`, // Start with AAA to ensure it appears first
      description: "Test description",
      price: "19.99",
      category_id: testCategoryId,
    };

    const createdBook = await BookService.createBook(testUserId, bookData);

    expect(createdBook).not.toBeNull();

    if (!createdBook) {
      throw new Error("Failed to create test book");
    }

    testBookId = createdBook.id;

    // Get all books to see what we have
    const result = await BookService.getAllBooks({
      page: 1,
      limit: 10,
    });

    expect(result.data).toBeDefined();
    expect(result.pagination).toBeDefined();
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(Array.isArray(result.data)).toBe(true);

    // Check if our test book is in the results
    const foundBook = result.data.find((book) => book.id === testBookId);

    expect(foundBook).toBeDefined();
    expect(foundBook?.title).toBe(`AAA Test Book ${timestamp}`);
  });

  it("should search books by title", async () => {
    // Create unique test books
    const timestamp = Date.now();
    const book1 = await BookService.createBook(testUserId, {
      title: `JavaScript Guide ${timestamp}`,
      description: "Learn JavaScript",
      price: "19.99",
      thumbnail: "https://example.com/js.jpg",
      category_id: testCategoryId,
      tag_ids: [],
    });

    const book2 = await BookService.createBook(testUserId, {
      title: `Python Basics ${timestamp}`,
      description: "Learn Python",
      price: "24.99",
      thumbnail: "https://example.com/py.jpg",
      category_id: testCategoryId,
      tag_ids: [],
    });

    expect(book1).not.toBeNull();
    expect(book2).not.toBeNull();

    if (!book1 || !book2) {
      throw new Error("Failed to create test books");
    }

    // Search for JavaScript
    const jsResults = await BookService.getAllBooks({
      page: 1,
      limit: 10,
      search: `JavaScript Guide ${timestamp}`,
    });

    expect(jsResults.data).toHaveLength(1);
    const foundJsBook = jsResults.data.find((book) => book.id === book1.id);
    expect(foundJsBook).toBeDefined();

    // Search for Python
    const pyResults = await BookService.getAllBooks({
      page: 1,
      limit: 10,
      search: `Python Basics ${timestamp}`,
    });

    expect(pyResults.data).toHaveLength(1);
    const foundPyBook = pyResults.data.find((book) => book.id === book2.id);
    expect(foundPyBook).toBeDefined();
  });

  it("should sort books by title", async () => {
    // Create test books with different titles
    await BookService.createBook(testUserId, {
      title: "Apple Book",
      price: "20.00",
      category_id: testCategoryId,
    });

    await BookService.createBook(testUserId, {
      title: "Zebra Book",
      price: "25.00",
      category_id: testCategoryId,
    });

    // Sort ascending
    const ascResults = await BookService.getAllBooks({
      sort: "title_asc",
    });

    expect(ascResults.data.length).toBeGreaterThanOrEqual(2);

    // Sort descending
    const descResults = await BookService.getAllBooks({
      sort: "title_desc",
    });

    expect(descResults.data.length).toBeGreaterThanOrEqual(2);
  });

  it("should get user's books only", async () => {
    // Create test book
    const bookData = {
      title: "My Personal Book",
      price: "15.00",
      category_id: testCategoryId,
    };

    const createdBook = await BookService.createBook(testUserId, bookData);

    expect(createdBook).not.toBeNull();

    if (!createdBook) {
      throw new Error("Failed to create test book");
    }

    testBookId = createdBook.id;

    const userBooks = await BookService.getUserBooks(testUserId);

    expect(userBooks.data).toBeDefined();
    expect(userBooks.data.length).toBeGreaterThanOrEqual(1);

    const foundBook = userBooks.data.find((book) => book.id === testBookId);
    expect(foundBook).toBeDefined();
    expect(foundBook?.title).toBe("My Personal Book");
  });

  it("should update a book (owner only)", async () => {
    // Create test book
    const bookData = {
      title: "Original Title",
      price: "10.00",
      category_id: testCategoryId,
    };

    const createdBook = await BookService.createBook(testUserId, bookData);

    expect(createdBook).not.toBeNull();

    if (!createdBook) {
      throw new Error("Failed to create test book");
    }

    testBookId = createdBook.id;

    // Update the book
    const updateData = {
      title: "Updated Title",
      price: "15.00",
    };

    const updatedBook = await BookService.updateBook(
      testBookId,
      testUserId,
      updateData,
    );

    expect(updatedBook).toBeDefined();
    expect(updatedBook?.title).toBe("Updated Title");
    expect(updatedBook?.price).toBe("15.00");
  });

  it("should delete a book (owner only)", async () => {
    // Create test book
    const bookData = {
      title: "Book to Delete",
      price: "12.00",
      category_id: testCategoryId,
    };

    const createdBook = await BookService.createBook(testUserId, bookData);

    expect(createdBook).not.toBeNull();

    if (!createdBook) {
      throw new Error("Failed to create test book");
    }

    testBookId = createdBook.id;

    // Delete the book
    const deleted = await BookService.deleteBook(testBookId, testUserId);
    expect(deleted).toBe(true);

    // Verify book is deleted
    const deletedBook = await BookService.getBookById(testBookId);
    expect(deletedBook).toBeNull();
  });

  it("should not allow non-owners to update/delete books", async () => {
    // Create a book with the first user
    const book = await BookService.createBook(testUserId, {
      title: "Owner's Book",
      price: "25.00",
      category_id: testCategoryId,
    });

    // Create another user
    const [anotherUser] = await db
      .insert(users)
      .values({
        name: "Another User",
        username: "anotheruser",
        email: "another@example.com",
        password_hash: await bcrypt.hash("password123", 10),
      })
      .returning();

    // Try to update the book with another user (should fail)
    const updateResult = await BookService.updateBook(
      book!.id,
      anotherUser.id,
      {
        title: "Hacked Title",
      },
    );
    expect(updateResult).toBeNull();

    // Try to delete the book with another user (should fail)
    const deleteResult = await BookService.deleteBook(book!.id, anotherUser.id);
    expect(deleteResult).toBe(false);

    // Clean up
    await db.delete(users).where(eq(users.id, anotherUser.id));
  });

  it("should enforce proper authorization for book operations", async () => {
    // Create a book
    const book = await BookService.createBook(testUserId, {
      title: "Protected Book",
      price: "30.00",
      category_id: testCategoryId,
    });

    expect(book).toBeDefined();
    if (!book) return;

    // Create another user
    const [unauthorizedUser] = await db
      .insert(users)
      .values({
        name: "Unauthorized User",
        username: "unauthorized",
        email: "unauthorized@example.com",
        password_hash: await bcrypt.hash("password123", 10),
      })
      .returning();

    // Test unauthorized update
    const unauthorizedUpdate = await BookService.updateBook(
      book.id,
      unauthorizedUser.id,
      {
        title: "Should Not Work",
        price: "999.99",
      },
    );
    expect(unauthorizedUpdate).toBeNull();

    // Test unauthorized delete
    const unauthorizedDelete = await BookService.deleteBook(
      book.id,
      unauthorizedUser.id,
    );
    expect(unauthorizedDelete).toBe(false);

    // Verify book still exists and unchanged
    const unchangedBook = await BookService.getBookById(book.id);
    expect(unchangedBook).toBeDefined();
    expect(unchangedBook!.title).toBe("Protected Book");
    expect(unchangedBook!.price).toBe("30.00");

    // Test authorized operations work
    const authorizedUpdate = await BookService.updateBook(book.id, testUserId, {
      title: "Updated by Owner",
    });
    expect(authorizedUpdate).toBeDefined();
    expect(authorizedUpdate!.title).toBe("Updated by Owner");

    // Clean up
    await db.delete(users).where(eq(users.id, unauthorizedUser.id));
  });

  it("should handle invalid book IDs gracefully", async () => {
    // Test getting non-existent book
    const nonExistentBook = await BookService.getBookById(99999);
    expect(nonExistentBook).toBeNull();

    // Test updating non-existent book
    const updateResult = await BookService.updateBook(99999, testUserId, {
      title: "Should Not Work",
    });
    expect(updateResult).toBeNull();

    // Test deleting non-existent book
    const deleteResult = await BookService.deleteBook(99999, testUserId);
    expect(deleteResult).toBe(false);
  });

  it("should validate book creation with invalid data", async () => {
    // Test with invalid category
    await expect(
      BookService.createBook(testUserId, {
        title: "Test Book",
        price: "25.99",
        category_id: 99999, // Non-existent category
      }),
    ).rejects.toThrow();

    // Test with invalid tag IDs
    await expect(
      BookService.createBook(testUserId, {
        title: "Test Book",
        price: "25.99",
        category_id: testCategoryId,
        tag_ids: [99999], // Non-existent tag
      }),
    ).rejects.toThrow();
  });

  it("should create and get categories", async () => {
    const categoryData = {
      name: `Fiction_${Date.now()}`,
      description: "Fictional books",
    };

    const createdCategory = await BookService.createCategory(
      categoryData.name,
      categoryData.description,
    );

    expect(createdCategory).toBeDefined();
    expect(createdCategory.name).toBe(categoryData.name);
    expect(createdCategory.description).toBe("Fictional books");

    const allCategories = await BookService.getAllCategories();
    expect(allCategories.length).toBeGreaterThanOrEqual(1);

    const foundCategory = allCategories.find(
      (cat) => cat.id === createdCategory.id,
    );
    expect(foundCategory).toBeDefined();

    // Clean up
    await db.delete(categories).where(eq(categories.id, createdCategory.id));
  });

  it("should create and get tags", async () => {
    const tagName = "Programming";

    const createdTag = await BookService.createTag(tagName);

    expect(createdTag).toBeDefined();
    expect(createdTag.name).toBe("Programming");

    const allTags = await BookService.getAllTags();
    expect(allTags.length).toBeGreaterThanOrEqual(1);

    const foundTag = allTags.find((tag) => tag.id === createdTag.id);
    expect(foundTag).toBeDefined();

    // Clean up
    await db.delete(tags).where(eq(tags.id, createdTag.id));
  });

  it("should filter books by category, price range, and tags", async () => {
    // Create additional categories and tags for filtering tests with unique names
    const timestamp = Date.now();
    const testCategory1 = await BookService.createCategory(
      `Fiction_${timestamp}`,
      "Fiction books",
    );
    const testCategory2 = await BookService.createCategory(
      `Science_${timestamp}`,
      "Science books",
    );
    const testTag1 = await BookService.createTag(`Adventure_${timestamp}`);
    const testTag2 = await BookService.createTag(`Educational_${timestamp}`);

    // Create books with different categories, prices, and tags
    const book1 = await BookService.createBook(testUserId, {
      title: "Adventure Novel",
      description: "An exciting adventure",
      price: "15.99",
      category_id: testCategory1.id,
      tag_ids: [testTag1.id],
    });

    const book2 = await BookService.createBook(testUserId, {
      title: "Science Guide",
      description: "Educational science book",
      price: "25.99",
      category_id: testCategory2.id,
      tag_ids: [testTag2.id],
    });

    const book3 = await BookService.createBook(testUserId, {
      title: "Expensive Fiction",
      description: "Premium fiction book",
      price: "45.99",
      category_id: testCategory1.id,
      tag_ids: [testTag1.id, testTag2.id],
    });

    // Verify all books were created successfully
    expect(book1).toBeDefined();
    expect(book2).toBeDefined();
    expect(book3).toBeDefined();

    if (!book1 || !book2 || !book3) {
      throw new Error("Failed to create test books");
    }

    // Test category filtering
    const fictionBooks = await BookService.getAllBooks({
      category_id: testCategory1.id,
    });
    expect(fictionBooks.data.length).toBeGreaterThanOrEqual(2);
    expect(
      fictionBooks.data.every((book) => book.category?.id === testCategory1.id),
    ).toBe(true);

    // Test price range filtering
    const affordableBooks = await BookService.getAllBooks({
      min_price: 10,
      max_price: 30,
    });
    expect(affordableBooks.data.length).toBeGreaterThanOrEqual(2);
    expect(
      affordableBooks.data.every((book) => {
        const price = parseFloat(book.price);
        return price >= 10 && price <= 30;
      }),
    ).toBe(true);

    // Test minimum price only
    const expensiveBooks = await BookService.getAllBooks({
      min_price: 40,
    });
    expect(expensiveBooks.data.length).toBeGreaterThanOrEqual(1);
    expect(
      expensiveBooks.data.every((book) => parseFloat(book.price) >= 40),
    ).toBe(true);

    // Test maximum price only
    const cheapBooks = await BookService.getAllBooks({
      max_price: 20,
    });
    expect(cheapBooks.data.length).toBeGreaterThanOrEqual(1);
    expect(cheapBooks.data.every((book) => parseFloat(book.price) <= 20)).toBe(
      true,
    );

    // Test combined filters: Fiction books under $30
    const affordableFiction = await BookService.getAllBooks({
      category_id: testCategory1.id,
      max_price: 30,
    });
    expect(affordableFiction.data.length).toBeGreaterThanOrEqual(1);
    expect(
      affordableFiction.data.every(
        (book) =>
          book.category?.id === testCategory1.id &&
          parseFloat(book.price) <= 30,
      ),
    ).toBe(true);

    // Clean up test data
    await db.delete(books).where(eq(books.id, book1.id));
    await db.delete(books).where(eq(books.id, book2.id));
    await db.delete(books).where(eq(books.id, book3.id));
    await db.delete(categories).where(eq(categories.id, testCategory1.id));
    await db.delete(categories).where(eq(categories.id, testCategory2.id));
    await db.delete(tags).where(eq(tags.id, testTag1.id));
    await db.delete(tags).where(eq(tags.id, testTag2.id));
  });
});
