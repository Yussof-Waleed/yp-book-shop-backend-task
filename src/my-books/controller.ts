// My Books controller - handles HTTP requests for user's own books
import { BookService } from "../books/service.js";
import type { Context } from "hono";
import { sendErrorResponse } from "../common/errorHandler.js";

export class MyBooksController {
  // GET /my-books - Get current user's books
  static async getMyBooks(c: Context) {
    try {
      const userInfo = c.get("user");
      // Use manual parsing since typing is difficult with zValidator
      const url = new URL(c.req.url);
      const filters = {
        search: url.searchParams.get("search") || undefined,
        sort: (url.searchParams.get("sort") || "title_asc") as
          | "title_asc"
          | "title_desc"
          | "price_asc"
          | "price_desc",
        category_id: url.searchParams.get("category_id")
          ? parseInt(url.searchParams.get("category_id")!)
          : undefined,
        min_price: url.searchParams.get("min_price")
          ? parseFloat(url.searchParams.get("min_price")!)
          : undefined,
        max_price: url.searchParams.get("max_price")
          ? parseFloat(url.searchParams.get("max_price")!)
          : undefined,
        tag_ids: url.searchParams
          .getAll("tag_ids")
          .map((id) => parseInt(id))
          .filter((id) => !isNaN(id)),
        page: url.searchParams.get("page")
          ? parseInt(url.searchParams.get("page")!)
          : 1,
        limit: url.searchParams.get("limit")
          ? parseInt(url.searchParams.get("limit")!)
          : 10,
      };

      const result = await BookService.getUserBooks(userInfo.id, filters);

      return c.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        error: null,
      });
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }

  // POST /my-books - Create new book
  static async createMyBook(c: Context) {
    try {
      const userInfo = c.get("user");
      // Use manual parsing since typing is difficult with zValidator
      const body = await c.req.json();

      const book = await BookService.createBook(userInfo.id, body);

      return c.json(
        {
          success: true,
          data: book,
          error: null,
        },
        201,
      );
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }

  // PUT /my-books/:id - Update book
  static async updateMyBook(c: Context) {
    try {
      const userInfo = c.get("user");
      const bookId = parseInt(c.req.param("id"));
      const body = await c.req.json();

      const book = await BookService.updateBook(bookId, userInfo.id, body);

      if (!book) {
        return c.json(
          {
            success: false,
            data: null,
            error: "Book not found or you don't have permission to edit it",
          },
          403,
        );
      }

      return c.json({
        success: true,
        data: book,
        error: null,
      });
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }

  // DELETE /my-books/:id - Delete book
  static async deleteMyBook(c: Context) {
    try {
      const userInfo = c.get("user");
      const bookId = parseInt(c.req.param("id"));

      const deleted = await BookService.deleteBook(bookId, userInfo.id);

      if (!deleted) {
        return c.json(
          {
            success: false,
            data: null,
            error: "Book not found or you don't have permission to delete it",
          },
          403,
        );
      }

      return c.json({
        success: true,
        data: { message: "Book deleted successfully" },
        error: null,
      });
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }
}
