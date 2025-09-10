import { db } from "../common/db.js";
import { books, categories, tags, bookTags, users } from "../models/index.js";
import { eq, desc, asc, like, and, sql, inArray } from "drizzle-orm";

export interface CreateBookData {
  title: string;
  description?: string;
  price: string;
  thumbnail?: string;
  category_id: number;
  tag_ids?: number[];
}

export interface UpdateBookData {
  title?: string;
  description?: string;
  price?: string;
  thumbnail?: string;
  category_id?: number;
  tag_ids?: number[];
}

export interface BookFilters {
  search?: string;
  sort?: "title_asc" | "title_desc" | "price_asc" | "price_desc";
  category_id?: number;
  min_price?: number;
  max_price?: number;
  tag_ids?: number[];
  page?: number;
  limit?: number;
}

export class BookService {
  static async getAllBooks(filters: BookFilters = {}) {
    const {
      search,
      sort = "title_asc",
      category_id,
      min_price,
      max_price,
      page = 1,
      limit = 10,
    } = filters;

    const offset = (page - 1) * limit;

    const whereConditions = [];

    if (search) {
      whereConditions.push(
        sql`LOWER(${books.title}) LIKE LOWER(${`%${search}%`})`,
      );
    }

    if (category_id) {
      whereConditions.push(eq(books.category_id, category_id));
    }

    if (min_price !== undefined) {
      whereConditions.push(sql`${books.price}::numeric >= ${min_price}`);
    }
    if (max_price !== undefined) {
      whereConditions.push(sql`${books.price}::numeric <= ${max_price}`);
    }
    let orderBy;
    switch (sort) {
      case "title_desc":
        orderBy = desc(books.title);
        break;
      case "price_asc":
        orderBy = asc(sql`${books.price}::numeric`);
        break;
      case "price_desc":
        orderBy = desc(sql`${books.price}::numeric`);
        break;
      default:
        orderBy = asc(books.title);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const booksData = await db
      .select({
        id: books.id,
        title: books.title,
        description: books.description,
        price: books.price,
        thumbnail: books.thumbnail,
        created_at: books.created_at,
        updated_at: books.updated_at,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
        },
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(books)
      .leftJoin(users, eq(books.author_id, users.id))
      .leftJoin(categories, eq(books.category_id, categories.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(whereClause);

    const total = totalCountResult[0]?.count || 0;

    return {
      data: booksData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  static async getBookById(id: number) {
    const bookData = await db
      .select({
        id: books.id,
        title: books.title,
        description: books.description,
        price: books.price,
        thumbnail: books.thumbnail,
        created_at: books.created_at,
        updated_at: books.updated_at,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          email: users.email,
        },
        category: {
          id: categories.id,
          name: categories.name,
          description: categories.description,
        },
      })
      .from(books)
      .leftJoin(users, eq(books.author_id, users.id))
      .leftJoin(categories, eq(books.category_id, categories.id))
      .where(eq(books.id, id))
      .limit(1);

    if (!bookData.length) {
      return null;
    }

    const bookTagsData = await db
      .select({
        id: tags.id,
        name: tags.name,
      })
      .from(bookTags)
      .leftJoin(tags, eq(bookTags.tag_id, tags.id))
      .where(eq(bookTags.book_id, id));

    return {
      ...bookData[0],
      tags: bookTagsData,
    };
  }

  static async createBook(authorId: number, bookData: CreateBookData) {
    const { tag_ids, ...bookInfo } = bookData;

    const [newBook] = await db
      .insert(books)
      .values({
        ...bookInfo,
        author_id: authorId,
        updated_at: new Date(),
      })
      .returning();

    if (tag_ids && tag_ids.length > 0) {
      const tagRelations = tag_ids.map((tagId) => ({
        book_id: newBook.id,
        tag_id: tagId,
      }));
      await db.insert(bookTags).values(tagRelations);
    }

    return await this.getBookById(newBook.id);
  }

  static async updateBook(
    bookId: number,
    authorId: number,
    updateData: UpdateBookData,
  ) {
    const existingBook = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.author_id, authorId)))
      .limit(1);

    if (!existingBook.length) {
      return null;
    }

    const { tag_ids, ...bookInfo } = updateData;

    await db
      .update(books)
      .set({
        ...bookInfo,
        updated_at: new Date(),
      })
      .where(eq(books.id, bookId));

    if (tag_ids !== undefined) {
      await db.delete(bookTags).where(eq(bookTags.book_id, bookId));

      if (tag_ids.length > 0) {
        const tagRelations = tag_ids.map((tagId) => ({
          book_id: bookId,
          tag_id: tagId,
        }));
        await db.insert(bookTags).values(tagRelations);
      }
    }

    return await this.getBookById(bookId);
  }

  static async deleteBook(bookId: number, authorId: number) {
    const result = await db
      .delete(books)
      .where(and(eq(books.id, bookId), eq(books.author_id, authorId)))
      .returning();

    return result.length > 0;
  }
  static async getUserBooks(authorId: number, filters: BookFilters = {}) {
    const {
      search,
      sort = "title_asc",
      category_id,
      min_price,
      max_price,
      tag_ids,
      page = 1,
      limit = 10,
    } = filters;

    const offset = (page - 1) * limit;

    const whereConditions = [eq(books.author_id, authorId)];

    // Search by title
    if (search) {
      whereConditions.push(like(books.title, `%${search}%`));
    }

    // Filter by category
    if (category_id) {
      whereConditions.push(eq(books.category_id, category_id));
    }

    // Filter by price range
    if (min_price !== undefined) {
      whereConditions.push(sql`${books.price}::numeric >= ${min_price}`);
    }
    if (max_price !== undefined) {
      whereConditions.push(sql`${books.price}::numeric <= ${max_price}`);
    }

    // Filter by tags if provided
    if (tag_ids && tag_ids.length > 0) {
      whereConditions.push(
        sql`${books.id} IN (
          SELECT ${bookTags.book_id} 
          FROM ${bookTags} 
          WHERE ${inArray(bookTags.tag_id, tag_ids)}
        )`,
      );
    }

    const whereClause = and(...whereConditions);

    // Build sort order
    let orderBy;
    switch (sort) {
      case "title_desc":
        orderBy = desc(books.title);
        break;
      case "price_asc":
        orderBy = asc(sql`${books.price}::numeric`);
        break;
      case "price_desc":
        orderBy = desc(sql`${books.price}::numeric`);
        break;
      default:
        orderBy = asc(books.title);
    }

    // Get user's books
    const booksData = await db
      .select({
        id: books.id,
        title: books.title,
        description: books.description,
        price: books.price,
        thumbnail: books.thumbnail,
        created_at: books.created_at,
        updated_at: books.updated_at,
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(books)
      .leftJoin(categories, eq(books.category_id, categories.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get total count with same filters
    const countWhereConditions = [eq(books.author_id, authorId)];

    if (search) {
      countWhereConditions.push(like(books.title, `%${search}%`));
    }
    if (category_id) {
      countWhereConditions.push(eq(books.category_id, category_id));
    }
    if (min_price !== undefined) {
      countWhereConditions.push(sql`${books.price}::numeric >= ${min_price}`);
    }
    if (max_price !== undefined) {
      countWhereConditions.push(sql`${books.price}::numeric <= ${max_price}`);
    }
    if (tag_ids && tag_ids.length > 0) {
      countWhereConditions.push(
        sql`${books.id} IN (
          SELECT ${bookTags.book_id} 
          FROM ${bookTags} 
          WHERE ${inArray(bookTags.tag_id, tag_ids)}
        )`,
      );
    }

    const countWhereClause = and(...countWhereConditions);

    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(countWhereClause);

    const total = totalCountResult[0]?.count || 0;

    return {
      data: booksData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get all categories
  static async getAllCategories() {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  // Get all tags
  static async getAllTags() {
    return await db.select().from(tags).orderBy(asc(tags.name));
  }

  // Create category
  static async createCategory(name: string, description?: string) {
    const [category] = await db
      .insert(categories)
      .values({ name, description })
      .returning();
    return category;
  }

  // Create tag
  static async createTag(name: string) {
    const [tag] = await db.insert(tags).values({ name }).returning();
    return tag;
  }
}
