// My Books service - business logic for user's own books
import { BookService } from "../books/service.js";
import type { CreateBookData, UpdateBookData } from "../books/service.js";

// My Books service extends the main BookService for user-specific operations
export class MyBooksService {
  // All functionality is handled by BookService.getUserBooks and BookService.createBook
  // This service acts as a dedicated interface for my-books operations

  static async getUserBooks(userId: number, query: Record<string, unknown>) {
    return BookService.getUserBooks(userId, query);
  }

  static async createUserBook(userId: number, bookData: CreateBookData) {
    return BookService.createBook(userId, bookData);
  }

  static async updateUserBook(
    bookId: number,
    userId: number,
    updateData: UpdateBookData,
  ) {
    return BookService.updateBook(bookId, userId, updateData);
  }

  static async deleteUserBook(bookId: number, userId: number) {
    return BookService.deleteBook(bookId, userId);
  }
}
