// Database seeding script for book shop backend
// Populates database with realistic test data for testing features

import "dotenv/config";
import * as bcrypt from "bcrypt";
import { db } from "../common/db.js";
import { books, categories, tags, bookTags, users } from "../models/index.js";

// Sample data constants
const SAMPLE_CATEGORIES = [
  { name: "Fiction", description: "Fictional stories and novels" },
  { name: "Non-Fiction", description: "Real-world topics and factual content" },
  {
    name: "Science Fiction",
    description: "Futuristic and speculative fiction",
  },
  { name: "Fantasy", description: "Magical and fantastical worlds" },
  { name: "Mystery", description: "Crime, detective, and mystery stories" },
  { name: "Romance", description: "Love stories and romantic fiction" },
  { name: "Thriller", description: "Suspenseful and thrilling narratives" },
  { name: "Biography", description: "Life stories of notable people" },
  { name: "History", description: "Historical events and periods" },
  { name: "Self-Help", description: "Personal development and improvement" },
  { name: "Technology", description: "Tech-related books and guides" },
  { name: "Business", description: "Business and entrepreneurship" },
];

const SAMPLE_TAGS = [
  "bestseller",
  "award-winning",
  "classic",
  "contemporary",
  "young-adult",
  "adult",
  "children",
  "educational",
  "inspirational",
  "adventure",
  "drama",
  "comedy",
  "horror",
  "psychological",
  "philosophical",
  "scientific",
  "technical",
  "practical",
  "theoretical",
  "beginner-friendly",
  "advanced",
  "illustrated",
  "series",
  "standalone",
  "first-edition",
];

const SAMPLE_USERS = [
  {
    name: "Alice Writer",
    username: "alice_writer",
    email: "alice@example.com",
  },
  { name: "Bob Author", username: "bob_author", email: "bob@example.com" },
  {
    name: "Charlie Novelist",
    username: "charlie_novelist",
    email: "charlie@example.com",
  },
  { name: "Diana Poet", username: "diana_poet", email: "diana@example.com" },
  {
    name: "Eve Storyteller",
    username: "eve_storyteller",
    email: "eve@example.com",
  },
  {
    name: "Frank Scribe",
    username: "frank_scribe",
    email: "frank@example.com",
  },
  {
    name: "Grace Wordsmith",
    username: "grace_wordsmith",
    email: "grace@example.com",
  },
  {
    name: "Henry Penman",
    username: "henry_penman",
    email: "henry@example.com",
  },
  { name: "Ivy Creator", username: "ivy_creator", email: "ivy@example.com" },
  {
    name: "Jack Bibliophile",
    username: "jack_bibliophile",
    email: "jack@example.com",
  },
];

const SAMPLE_BOOKS = [
  {
    title: "The Digital Revolution",
    description:
      "A comprehensive guide to understanding how technology is reshaping our world. Explores AI, blockchain, and the future of digital transformation.",
    price: "29.99",
    thumbnail: "https://example.com/thumbnails/digital-revolution.jpg",
    category: "Technology",
    tags: ["contemporary", "educational", "technical", "bestseller"],
  },
  {
    title: "Mysteries of the Deep Ocean",
    description:
      "An exploration of the unexplored depths of our oceans and the fascinating creatures that inhabit them.",
    price: "24.50",
    thumbnail: "https://example.com/thumbnails/ocean-mysteries.jpg",
    category: "Non-Fiction",
    tags: ["scientific", "educational", "illustrated", "contemporary"],
  },
  {
    title: "The Last Star Navigator",
    description:
      "In a galaxy where space travel has become routine, one navigator discovers an ancient secret that could change everything.",
    price: "19.99",
    thumbnail: "https://example.com/thumbnails/star-navigator.jpg",
    category: "Science Fiction",
    tags: ["adventure", "series", "young-adult", "bestseller"],
  },
  {
    title: "Building Better Habits",
    description:
      "A practical guide to developing positive habits and breaking negative ones. Transform your life one habit at a time.",
    price: "16.95",
    thumbnail: "https://example.com/thumbnails/better-habits.jpg",
    category: "Self-Help",
    tags: ["practical", "inspirational", "beginner-friendly", "contemporary"],
  },
  {
    title: "The Crimson Detective",
    description:
      "Detective Sarah Chen investigates a series of mysterious disappearances in Victorian London.",
    price: "22.00",
    thumbnail: "https://example.com/thumbnails/crimson-detective.jpg",
    category: "Mystery",
    tags: ["thriller", "historical", "series", "award-winning"],
  },
  {
    title: "Love in Silicon Valley",
    description:
      "A modern romance about two tech entrepreneurs who find love while building competing startups.",
    price: "18.75",
    thumbnail: "https://example.com/thumbnails/silicon-love.jpg",
    category: "Romance",
    tags: ["contemporary", "comedy", "young-adult", "standalone"],
  },
  {
    title: "The Enchanted Forest Chronicles",
    description:
      "A magical tale of a young sorceress who must save her kingdom from an ancient evil.",
    price: "26.99",
    thumbnail: "https://example.com/thumbnails/enchanted-forest.jpg",
    category: "Fantasy",
    tags: ["adventure", "young-adult", "series", "bestseller"],
  },
  {
    title: "Leadership in the Modern Age",
    description:
      "Essential leadership principles for today's rapidly changing business environment.",
    price: "32.50",
    thumbnail: "https://example.com/thumbnails/modern-leadership.jpg",
    category: "Business",
    tags: ["practical", "educational", "advanced", "contemporary"],
  },
  {
    title: "The Psychology of Success",
    description:
      "Understanding the mental patterns and behaviors that lead to achievement and fulfillment.",
    price: "21.99",
    thumbnail: "https://example.com/thumbnails/psychology-success.jpg",
    category: "Self-Help",
    tags: ["psychological", "inspirational", "educational", "bestseller"],
  },
  {
    title: "Quantum Computing Explained",
    description:
      "A beginner-friendly introduction to quantum computing concepts and their real-world applications.",
    price: "34.95",
    thumbnail: "https://example.com/thumbnails/quantum-computing.jpg",
    category: "Technology",
    tags: ["scientific", "technical", "beginner-friendly", "illustrated"],
  },
  {
    title: "The Time Traveler's Paradox",
    description:
      "When a physicist accidentally creates a time machine, he must navigate the complex consequences of altering the past.",
    price: "20.50",
    thumbnail: "https://example.com/thumbnails/time-paradox.jpg",
    category: "Science Fiction",
    tags: ["philosophical", "thriller", "standalone", "award-winning"],
  },
  {
    title: "Medieval Kingdoms",
    description:
      "A detailed historical account of European medieval kingdoms and their political structures.",
    price: "28.00",
    thumbnail: "https://example.com/thumbnails/medieval-kingdoms.jpg",
    category: "History",
    tags: ["educational", "historical", "illustrated", "academic"],
  },
  {
    title: "The Shadow Conspiracy",
    description:
      "A journalist uncovers a conspiracy that reaches the highest levels of government.",
    price: "19.25",
    thumbnail: "https://example.com/thumbnails/shadow-conspiracy.jpg",
    category: "Thriller",
    tags: ["psychological", "contemporary", "thriller", "standalone"],
  },
  {
    title: "Mindful Living Guide",
    description:
      "Practical techniques for incorporating mindfulness into your daily routine.",
    price: "15.99",
    thumbnail: "https://example.com/thumbnails/mindful-living.jpg",
    category: "Self-Help",
    tags: ["practical", "inspirational", "beginner-friendly", "illustrated"],
  },
  {
    title: "The Dragon's Legacy",
    description:
      "The final book in the epic fantasy trilogy about the last dragon rider.",
    price: "25.50",
    thumbnail: "https://example.com/thumbnails/dragons-legacy.jpg",
    category: "Fantasy",
    tags: ["adventure", "series", "epic", "award-winning"],
  },
  {
    title: "Data Science Fundamentals",
    description:
      "Essential concepts and practical techniques for aspiring data scientists.",
    price: "39.99",
    thumbnail: "https://example.com/thumbnails/data-science.jpg",
    category: "Technology",
    tags: ["educational", "technical", "practical", "beginner-friendly"],
  },
  {
    title: "The Art of Negotiation",
    description:
      "Master the skills of effective negotiation in business and personal relationships.",
    price: "23.75",
    thumbnail: "https://example.com/thumbnails/art-negotiation.jpg",
    category: "Business",
    tags: ["practical", "educational", "professional", "contemporary"],
  },
  {
    title: "Hidden Treasures of Rome",
    description:
      "A travel guide to the lesser-known historical sites and hidden gems of the Eternal City.",
    price: "17.50",
    thumbnail: "https://example.com/thumbnails/hidden-rome.jpg",
    category: "History",
    tags: ["illustrated", "travel", "educational", "contemporary"],
  },
  {
    title: "The Cyber Detective",
    description:
      "A tech-savvy detective solves crimes in the digital age using cutting-edge forensic technology.",
    price: "21.00",
    thumbnail: "https://example.com/thumbnails/cyber-detective.jpg",
    category: "Mystery",
    tags: ["contemporary", "technology", "thriller", "series"],
  },
  {
    title: "Startup Success Stories",
    description:
      "Learn from the journeys of successful entrepreneurs who built billion-dollar companies.",
    price: "27.99",
    thumbnail: "https://example.com/thumbnails/startup-stories.jpg",
    category: "Business",
    tags: ["inspirational", "biographical", "contemporary", "educational"],
  },
];

async function clearDatabase() {
  console.log("🧹 Clearing existing data...");

  // Delete in order to respect foreign key constraints
  await db.delete(bookTags);
  await db.delete(books);
  await db.delete(categories);
  await db.delete(tags);
  await db.delete(users);

  console.log("✅ Database cleared");
}

async function seedUsers() {
  console.log("👥 Seeding users...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  const userInserts = SAMPLE_USERS.map((user) => ({
    name: user.name,
    username: user.username,
    email: user.email,
    password_hash: hashedPassword,
  }));

  const insertedUsers = await db.insert(users).values(userInserts).returning();
  console.log(`✅ Created ${insertedUsers.length} users`);

  return insertedUsers;
}

async function seedCategories() {
  console.log("📚 Seeding categories...");

  const insertedCategories = await db
    .insert(categories)
    .values(SAMPLE_CATEGORIES)
    .returning();
  console.log(`✅ Created ${insertedCategories.length} categories`);

  return insertedCategories;
}

async function seedTags() {
  console.log("🏷️ Seeding tags...");

  const tagInserts = SAMPLE_TAGS.map((tagName) => ({ name: tagName }));
  const insertedTags = await db.insert(tags).values(tagInserts).returning();
  console.log(`✅ Created ${insertedTags.length} tags`);

  return insertedTags;
}

async function seedBooks(
  insertedUsers: (typeof users.$inferSelect)[],
  insertedCategories: (typeof categories.$inferSelect)[],
) {
  console.log("📖 Seeding books...");

  const bookInserts = SAMPLE_BOOKS.map((book, index) => {
    const author = insertedUsers[index % insertedUsers.length];
    const category = insertedCategories.find(
      (cat) => cat.name === book.category,
    );

    return {
      title: book.title,
      description: book.description,
      price: book.price,
      thumbnail: book.thumbnail,
      author_id: author.id,
      category_id: category!.id,
    };
  });

  const insertedBooks = await db.insert(books).values(bookInserts).returning();
  console.log(`✅ Created ${insertedBooks.length} books`);

  return insertedBooks;
}

async function seedBookTags(
  insertedBooks: (typeof books.$inferSelect)[],
  insertedTags: (typeof tags.$inferSelect)[],
) {
  console.log("🔗 Seeding book-tag relationships...");

  const bookTagInserts = [];

  for (let i = 0; i < insertedBooks.length; i++) {
    const book = insertedBooks[i];
    const bookData = SAMPLE_BOOKS[i];

    for (const tagName of bookData.tags) {
      const tag = insertedTags.find((t) => t.name === tagName);
      if (tag) {
        bookTagInserts.push({
          book_id: book.id,
          tag_id: tag.id,
        });
      }
    }
  }

  if (bookTagInserts.length > 0) {
    await db.insert(bookTags).values(bookTagInserts);
    console.log(`✅ Created ${bookTagInserts.length} book-tag relationships`);
  }
}

async function generateAdditionalBooks(
  insertedUsers: (typeof users.$inferSelect)[],
  insertedCategories: (typeof categories.$inferSelect)[],
  insertedTags: (typeof tags.$inferSelect)[],
  count: number = 30,
) {
  console.log(
    `📚 Generating ${count} additional books for better pagination testing...`,
  );

  const bookTitles = [
    "Advanced Programming Techniques",
    "The Future of AI",
    "Ancient Civilizations",
    "Modern Art Movements",
    "Space Exploration",
    "Cooking Mastery",
    "Financial Freedom",
    "Creative Writing Workshop",
    "Digital Marketing Guide",
    "Sustainable Living",
    "Philosophy for Beginners",
    "Music Theory Basics",
    "Photography Secrets",
    "Gardening Year-Round",
    "Fitness Revolution",
    "Travel Adventures",
    "Language Learning",
    "Investment Strategies",
    "Innovation Mindset",
    "Health Optimization",
    "Career Development",
    "Relationship Skills",
    "Time Management",
    "Stress Relief",
    "Memory Improvement",
    "Public Speaking",
    "Goal Setting",
    "Team Leadership",
    "Problem Solving",
    "Critical Thinking",
    "Emotional Intelligence",
    "Cultural Studies",
    "Environmental Science",
    "Architecture History",
    "Design Principles",
    "Mathematical Concepts",
  ];

  const descriptions = [
    "A comprehensive guide that explores advanced concepts and practical applications.",
    "Discover the latest trends and future possibilities in this fascinating field.",
    "An in-depth exploration of historical events and their lasting impact.",
    "Learn essential skills and techniques from industry experts.",
    "A practical handbook for beginners and experienced practitioners alike.",
    "Unlock the secrets to success with proven strategies and methods.",
    "Transform your understanding with this enlightening and accessible guide.",
  ];

  const additionalBooks = [];

  for (let i = 0; i < count; i++) {
    const title =
      bookTitles[i % bookTitles.length] +
      ` - Volume ${Math.floor(i / bookTitles.length) + 1}`;
    const description = descriptions[i % descriptions.length];
    const price = (Math.random() * 40 + 10).toFixed(2); // Random price between $10-50
    const author =
      insertedUsers[Math.floor(Math.random() * insertedUsers.length)];
    const category =
      insertedCategories[Math.floor(Math.random() * insertedCategories.length)];

    additionalBooks.push({
      title,
      description,
      price,
      thumbnail: `https://example.com/thumbnails/book-${i + 21}.jpg`,
      author_id: author.id,
      category_id: category.id,
    });
  }

  const insertedAdditionalBooks = await db
    .insert(books)
    .values(additionalBooks)
    .returning();

  // Add random tags to additional books
  const additionalBookTagInserts = [];
  for (const book of insertedAdditionalBooks) {
    const numberOfTags = Math.floor(Math.random() * 4) + 1; // 1-4 tags per book
    const selectedTags = insertedTags
      .sort(() => 0.5 - Math.random())
      .slice(0, numberOfTags);

    for (const tag of selectedTags) {
      additionalBookTagInserts.push({
        book_id: book.id,
        tag_id: tag.id,
      });
    }
  }

  if (additionalBookTagInserts.length > 0) {
    await db.insert(bookTags).values(additionalBookTagInserts);
  }

  console.log(
    `✅ Generated ${insertedAdditionalBooks.length} additional books with tags`,
  );
}

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");
    console.log("=".repeat(50));

    // Clear existing data
    await clearDatabase();

    // Seed base data
    const insertedUsers = await seedUsers();
    const insertedCategories = await seedCategories();
    const insertedTags = await seedTags();
    const insertedBooks = await seedBooks(insertedUsers, insertedCategories);

    // Create book-tag relationships
    await seedBookTags(insertedBooks, insertedTags);

    // Generate additional books for better testing
    await generateAdditionalBooks(
      insertedUsers,
      insertedCategories,
      insertedTags,
      30,
    );

    console.log("=".repeat(50));
    console.log("🎉 Database seeding completed successfully!");
    console.log("");
    console.log("📊 Summary:");
    console.log(`   • ${insertedUsers.length} users created`);
    console.log(`   • ${insertedCategories.length} categories created`);
    console.log(`   • ${insertedTags.length} tags created`);
    console.log(`   • ${insertedBooks.length + 30} total books created`);
    console.log("");
    console.log("🧪 Test credentials:");
    console.log("   • All users have password: 'password123'");
    console.log("   • Example login: alice_writer / password123");
    console.log("");
    console.log("✨ You can now test:");
    console.log("   • Pagination (50+ books)");
    console.log("   • Search functionality");
    console.log("   • Category filtering");
    console.log("   • Tag-based filtering");
    console.log("   • Author-based queries");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the seeding script
seedDatabase();
