import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user.js";

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Tags table
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 30 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Books table
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  thumbnail: varchar("thumbnail", { length: 500 }),
  author_id: integer("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category_id: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const bookTags = pgTable(
  "book_tags",
  {
    book_id: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    tag_id: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.book_id, table.tag_id] })],
);

export const booksRelations = relations(books, ({ one, many }) => ({
  author: one(users, {
    fields: [books.author_id],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [books.category_id],
    references: [categories.id],
  }),
  bookTags: many(bookTags),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  books: many(books),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  bookTags: many(bookTags),
}));

export const bookTagsRelations = relations(bookTags, ({ one }) => ({
  book: one(books, {
    fields: [bookTags.book_id],
    references: [books.id],
  }),
  tag: one(tags, {
    fields: [bookTags.tag_id],
    references: [tags.id],
  }),
}));
