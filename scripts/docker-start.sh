#!/bin/sh
set -e

echo "Book Shop API - Starting application setup..."

# Wait for PostgreSQL server to be running
echo "Waiting for PostgreSQL server..."
until pg_isready -h postgres -p 5432 -U postgres > /dev/null 2>&1; do
    echo "   PostgreSQL not ready yet, waiting..."
    sleep 2
done
echo "PostgreSQL server is running"

# Check if database exists and create if not
echo "Checking if database 'books_shop' exists..."
DB_EXISTS=$(PGPASSWORD=postgres psql -h postgres -U postgres -lqt | cut -d \| -f 1 | grep -qw books_shop && echo "yes" || echo "no")

if [ "$DB_EXISTS" = "no" ]; then
    echo "Database 'books_shop' not found, creating it..."
    PGPASSWORD=postgres createdb -h postgres -U postgres books_shop
    echo "Database 'books_shop' created successfully"
else
    echo "Database 'books_shop' already exists"
fi

# Test database connection with credentials
echo "Testing database connection with credentials..."
if PGPASSWORD=postgres psql -h postgres -U postgres -d books_shop -c "SELECT 1;" > /dev/null 2>&1; then
    echo "Database connection successful"
else
    echo "ERROR: Database connection failed - check credentials"
    exit 1
fi

# Wait for Redis and test connection
echo "Waiting for Redis..."
until redis-cli -h redis ping > /dev/null 2>&1; do
    echo "   Redis not ready yet, waiting..."
    sleep 2
done
echo "Redis is ready"

# Test Redis connection more thoroughly
echo "Testing Redis connection..."
if redis-cli -h redis set test_key "test_value" > /dev/null 2>&1 && redis-cli -h redis get test_key > /dev/null 2>&1; then
    redis-cli -h redis del test_key > /dev/null 2>&1
    echo "Redis connection test successful"
else
    echo "ERROR: Redis connection test failed"
    exit 1
fi

# Apply database migrations (direct SQL approach for reliability)
echo "Applying database schema..."
if [ -f "drizzle/0000_omniscient_thor.sql" ]; then
    echo "Applying database migrations from SQL file..."
    # Check if table already exists
    TABLE_EXISTS=$(PGPASSWORD=postgres psql -h postgres -U postgres -d books_shop -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users');" | tr -d ' ')
    
    if [ "$TABLE_EXISTS" = "f" ]; then
        echo "Creating users table..."
        if PGPASSWORD=postgres psql -h postgres -U postgres -d books_shop -f drizzle/0000_omniscient_thor.sql > /dev/null 2>&1; then
            echo "Database schema applied successfully"
        else
            echo "ERROR: Failed to apply database schema"
            exit 1
        fi
    else
        echo "Database schema already exists, skipping migration"
    fi
else
    echo "WARNING: No migration files found, continuing without schema setup"
fi

echo "Setup complete. Starting development server..."
exec npm run dev:local
