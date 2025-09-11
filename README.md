# 📚 Books Shop Backend API

A modern, secure REST API for managing a personal book collection and browsing books from all users. Built with TypeScript, Hono.js, PostgreSQL, and Redis.

## 🚀 Features

- **User Authentication** - Register, login, logout with JWT & Redis
- **User Profile Management** - Update profile, change password, password reset
- **Books Management** - Full CRUD operations for personal books
- **Books Discovery** - Browse, search, and filter all books
- **Categories & Tags** - Organize books with categories and tags
- **Advanced Search** - Filter by category, price range, and tags
- **Pagination & Sorting** - Efficient data browsing
- **Secure API** - JWT authentication with Redis token storage
- **Clean Architecture** - Feature-based structure, MVC pattern
- **Comprehensive Testing** - Unit tests with Vitest
- **Code Quality** - ESLint, Prettier, and TypeScript strict mode

## 🛠️ Tech Stack

- **Framework**: [Hono.js](https://hono.dev/) - Fast, lightweight web framework
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Cache/Sessions**: Redis
- **Authentication**: JWT with Redis storage
- **Validation**: Zod & Zod Validator
- **Testing**: Vitest
- **Code Quality**: ESLint + Prettier
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

Make sure you have the following installed:

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Yussof-Waleed/yp-book-shop-backend-task.git
cd yp-book-shop-backend-task
```

### 2. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Edit .env file with your preferred values (optional - defaults work fine)
# The default configuration is ready to use with Docker
```

### 3. Start with Docker (Recommended)

```bash
# Start all services (PostgreSQL, Redis, API)
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

The API will be available at `http://localhost:3000`

### 4. Database Setup

The database will be automatically migrated when the API starts. To seed with sample data:

```bash
# Seed the database with sample users, categories, and books
npm run db:seed
```

### 5. Test the API

Open your browser and visit:

- **Health Check**: `http://localhost:3000/`
- **API Documentation**: Import the Postman collection (see below)

## 🧪 Testing with Postman

### Import the Collection

1. **Open Postman**
2. **Click Import** → **Upload Files**
3. **Select** `postman-collection.json` from the project root
4. **Import** the collection

### Quick Test Flow

1. **Health Check** - Verify the API is running
2. **Register** - Create a new user account
3. **Login** - Get your authentication token
4. **Copy Token** - Copy the JWT token from login response
5. **Set Token** - Paste it in the `auth_token` collection variable
6. **Explore** - All authenticated endpoints will work automatically

### Pre-configured Test Data

The collection includes ready-to-use test credentials:

- **Email**: `test@example.com`
- **Username**: `testuser`
- **Password**: `password123`

## 📦 Available Scripts

### Docker Commands

```bash
npm run docker:up          # Start all services
npm run docker:down        # Stop all services
npm run docker:logs        # View API logs
npm run docker:shell       # Access API container shell
```

### Development

```bash
npm run dev                 # Start development server (Docker)
npm run dev:local          # Start development server (Local)
npm run build              # Build the application
npm run start              # Start production server
```

### Database

```bash
npm run db:generate        # Generate migration files
npm run db:migrate         # Run migrations
npm run db:seed           # Seed database with sample data
npm run db:reset          # Reset and seed database
```

### Testing & Quality

```bash
npm run test              # Run tests (Docker)
npm run test:local        # Run tests (Local)
npm run test:run          # Run tests once
npm run test:coverage     # Run tests with coverage
npm run lint              # Check code style
npm run lint:fix          # Fix code style issues
npm run format            # Format code with Prettier
```

## 🏗️ Project Structure

```
src/
├── auth/           # Authentication module
├── users/          # User profile management
├── books/          # Books browsing & management
├── my-books/       # Personal books CRUD
├── models/         # Database models & relations
├── common/         # Shared utilities (DB, Redis, etc.)
├── scripts/        # Database seeding scripts
└── tests/          # Integration tests
```

## 🔌 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with OTP

### User Profile

- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update profile
- `PUT /users/change-password` - Change password

### Books (Public)

- `GET /books` - List all books (with search, filter, pagination)
- `GET /books/:id` - Get book details

### My Books (Personal)

- `GET /my-books` - List my books
- `POST /my-books` - Create new book
- `PUT /my-books/:id` - Update my book
- `DELETE /my-books/:id` - Delete my book

### Categories & Tags

- `GET /categories` - List all categories
- `GET /tags` - List all tags

## 🔐 Authentication

The API uses JWT tokens stored in Redis for session management:

1. **Login** to get a JWT token
2. **Include token** in `Authorization: Bearer <token>` header
3. **Token expires** after 1 hour by default
4. **Logout** invalidates the token in Redis

## 🧪 Testing

The project includes comprehensive tests:

```bash
# Run all tests
npm run test:run

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test
```

## 📝 Code Quality

Code quality is enforced with:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **TypeScript** - Static type checking
- **Husky** - Git hooks for pre-commit checks

```bash
# Check and fix code quality
npm run lint:fix
npm run format
```

## 🐳 Docker Services

The docker-compose setup includes:

- **API** - The main application (Port 3000)
- **PostgreSQL** - Database (Port 5434 → 5432)
- **Redis** - Cache & sessions (Port 6380 → 6379)

External ports are offset to avoid conflicts with local services.

## 🔧 Environment Variables

Key environment variables (see `.env.example`):

```bash
# Database
DATABASE_URL=postgres://postgres:postgres@postgres:5432/books_shop

# Redis
REDIS_URL=redis://redis:6379

# JWT Secret (change in production!)
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long

# Server
PORT=3000
NODE_ENV=development
```

## 🚨 Troubleshooting

### Port Conflicts

If you have local PostgreSQL/Redis running:

- PostgreSQL: Uses port 5434 externally (instead of 5432)
- Redis: Uses port 6380 externally (instead of 6379)

### Database Connection Issues

```bash
# Check if services are running
docker-compose ps

# View logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs api
```

### Reset Everything

```bash
# Stop and remove all containers, images, and volumes
docker-compose down --rmi all --volumes
docker-compose up --build
```

## 📖 Additional Documentation

- **API Collection**: `POSTMAN.md` - Detailed Postman usage guide
- **Requirements**: `prd.txt` - Original project requirements
- **Database Schema**: Check `drizzle/` folder for migrations

## 🎯 Interview Task Context

This project was built as an interview assessment focusing on:

- ✅ Clean, maintainable code architecture
- ✅ Proper authentication & authorization
- ✅ Database design with relationships
- ✅ Comprehensive testing coverage
- ✅ Professional development practices
- ✅ Complete documentation & setup guides

## 📄 License

This project is for interview purposes and is not licensed for commercial use.

---

**Happy coding! 🚀**

For questions or issues, please refer to the troubleshooting section or check the included Postman collection for API examples.
