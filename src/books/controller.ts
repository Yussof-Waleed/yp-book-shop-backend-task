import type { Context } from "hono";
import { BookService } from "./service.js";
import { sendErrorResponse } from "../common/errorHandler.js";

export class BooksController {
  // GET /books
  static async getAllBooks(c: Context) {
    try {
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

      const result = await BookService.getAllBooks(filters);

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

  // GET /books/:id
  static async getBookById(c: Context) {
    try {
      const bookId = parseInt(c.req.param("id"));

      const book = await BookService.getBookById(bookId);

      return c.json({
        success: true,
        data: book,
        error: null,
      });
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }

  // GET /books/categories
  static async getCategories(c: Context) {
    try {
      const categories = await BookService.getAllCategories();

      return c.json({
        success: true,
        data: categories,
        error: null,
      });
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }

  // POST /books/categories
  static async createCategory(c: Context) {
    try {
      const data = await c.req.json();

      const category = await BookService.createCategory(
        data.name,
        data.description,
      );

      return c.json(
        {
          success: true,
          data: category,
          error: null,
        },
        201,
      );
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }

  // GET /books/tags
  static async getTags(c: Context) {
    try {
      const tags = await BookService.getAllTags();

      return c.json({
        success: true,
        data: tags,
        error: null,
      });
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }

  // POST /books/tags
  static async createTag(c: Context) {
    try {
      const data = await c.req.json();

      const tag = await BookService.createTag(data.name);

      return c.json(
        {
          success: true,
          data: tag,
          error: null,
        },
        201,
      );
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }
}
