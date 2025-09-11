// My Books routes - dedicated routes for user's own books (CUD operations)
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { MyBooksController } from "./controller.js";
import { authMiddleware } from "../auth/middleware.js";
import {
  getMyBooksQuerySchema,
  createBookSchema,
  updateBookSchema,
  bookIdParamSchema,
} from "./validation.js";

const myBooks = new Hono();

// All my-books routes require authentication
myBooks.use("*", authMiddleware);

// GET /my-books - Get current user's books with pagination, search, sort, and filters
myBooks.get(
  "/",
  zValidator("query", getMyBooksQuerySchema),
  MyBooksController.getMyBooks,
);

// POST /my-books - Create a new book for current user
myBooks.post(
  "/",
  zValidator("json", createBookSchema),
  MyBooksController.createMyBook,
);

// PUT /my-books/:id - Update a book owned by current user
myBooks.put(
  "/:id",
  zValidator("param", bookIdParamSchema),
  zValidator("json", updateBookSchema),
  MyBooksController.updateMyBook,
);

// DELETE /my-books/:id - Delete a book owned by current user
myBooks.delete(
  "/:id",
  zValidator("param", bookIdParamSchema),
  MyBooksController.deleteMyBook,
);

export default myBooks;
