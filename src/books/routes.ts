import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { BooksController } from "./controller.js";
import {
  getBooksQuerySchema,
  getBookByIdParamSchema,
  createCategorySchema,
  createTagSchema,
} from "./validation.js";

const books = new Hono();

books.get(
  "/",
  zValidator("query", getBooksQuerySchema),
  BooksController.getAllBooks,
);
books.get(
  "/:id",
  zValidator("param", getBookByIdParamSchema),
  BooksController.getBookById,
);

books.get("/categories/all", BooksController.getCategories);
books.post(
  "/categories",
  zValidator("json", createCategorySchema),
  BooksController.createCategory,
);

books.get("/tags/all", BooksController.getTags);
books.post(
  "/tags",
  zValidator("json", createTagSchema),
  BooksController.createTag,
);

export default books;
