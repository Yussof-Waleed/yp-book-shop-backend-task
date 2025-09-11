#!/bin/sh
set -e

echo "Book Shop API - Starting application setup..."


# Load environment variables from .env if present
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Use env vars or defaults
POSTGRES_DB="${POSTGRES_DB:-books_shop}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Wait for PostgreSQL server to be running
echo "Waiting for PostgreSQL server..."
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; do
    echo "   PostgreSQL not ready yet, waiting..."
    sleep 2
done
echo "PostgreSQL server is running"

# Check if database exists and create if not
echo "Checking if database '$POSTGRES_DB' exists..."
DB_EXISTS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -lqt | cut -d \| -f 1 | grep -qw "$POSTGRES_DB" && echo "yes" || echo "no")

if [ "$DB_EXISTS" = "no" ]; then
    echo "Database '$POSTGRES_DB' not found, creating it..."
    PGPASSWORD="$POSTGRES_PASSWORD" createdb -h "$POSTGRES_HOST" -U "$POSTGRES_USER" "$POSTGRES_DB"
    echo "Database '$POSTGRES_DB' created successfully"
    DATABASE_CREATED=true
else
    echo "Database '$POSTGRES_DB' already exists"
    DATABASE_CREATED=false
fi

# Test database connection with credentials
echo "Testing database connection with credentials..."
if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "Database connection successful"
else
    echo "ERROR: Database connection failed - check credentials"
    exit 1
fi

# Wait for Redis and test connection
echo "Waiting for Redis..."
until redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; do
    echo "   Redis not ready yet, waiting..."
    sleep 2
done
echo "Redis is ready"

# Test Redis connection more thoroughly
echo "Testing Redis connection..."
if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" set test_key "test_value" > /dev/null 2>&1 && redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" get test_key > /dev/null 2>&1; then
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" del test_key > /dev/null 2>&1
    echo "Redis connection test successful"
else
    echo "ERROR: Redis connection test failed"
    exit 1
fi

# Apply all database migrations in order
echo "Applying database migrations from drizzle/*.sql..."
for migration in $(ls drizzle/*.sql | sort); do
    # Extract first table name from migration file
    TABLE_NAME=$(grep -i -m1 '^CREATE TABLE' "$migration" | awk '{print $3}' | tr -d '"')
    if [ -z "$TABLE_NAME" ]; then
        echo "  Skipping $migration (no table found)"
        continue
    fi
    TABLE_EXISTS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$TABLE_NAME');" | tr -d ' ')
    if [ "$TABLE_EXISTS" = "f" ]; then
        echo "  Applying migration: $migration (creates $TABLE_NAME)"
        if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration" > /dev/null 2>&1; then
            echo "    Migration $migration applied successfully"
        else
            echo "    ERROR: Failed to apply migration $migration"
            exit 1
        fi
    else
        echo "  Table $TABLE_NAME already exists, skipping $migration"
    fi
done

# Seed database if it was just created
if [ "$DATABASE_CREATED" = "true" ]; then
    echo "Database was newly created, seeding with initial data..."
    if tsx src/scripts/seed.ts; then
        echo "Database seeding completed successfully"
    else
        echo "WARNING: Database seeding failed, but continuing with startup"
    fi
fi

echo "Setup complete. Starting development server..."
exec npm run dev:local
