#!/bin/bash



set -e

echo "🚀 Book Shop Backend - Docker Setup Validation"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    docker-compose down --volumes --remove-orphans 2>/dev/null || true
}

# Set trap for cleanup on exit
trap cleanup EXIT

echo -e "\n${YELLOW}📋 Pre-flight checks...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi
print_status "Docker is running"

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "docker-compose is not installed or not in PATH"
    exit 1
fi
print_status "docker-compose is available"

# Check if required files exist
required_files=("docker-compose.yml" "Dockerfile" "package.json" "scripts/docker-start.sh")
for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done
print_status "All required files are present"

echo -e "\n${YELLOW}🏗️  Building and starting services...${NC}"

# Build and start services
if docker-compose up --build -d; then
    print_status "Services built and started successfully"
else
    print_error "Failed to build or start services"
    exit 1
fi

echo -e "\n${YELLOW}⏳ Waiting for services to be ready...${NC}"

# Wait for services to be ready (max 60 seconds)
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:3000/ > /dev/null 2>&1; then
        print_status "API is responding"
        break
    fi
    
    attempt=$((attempt + 1))
    echo -n "."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    print_error "API failed to start within 60 seconds"
    echo -e "\n${YELLOW}📝 Container logs:${NC}"
    docker-compose logs api
    exit 1
fi

echo -e "\n${YELLOW}🧪 Running validation tests...${NC}"

# Test 1: Health endpoint
echo -n "Testing health endpoint... "
health_response=$(curl -s http://localhost:3000/)
if echo "$health_response" | grep -q '"success":true'; then
    print_status "Health endpoint working"
else
    print_error "Health endpoint failed"
    echo "Response: $health_response"
    exit 1
fi

# Test 2: Database connection
echo -n "Testing database connection... "
if docker-compose exec -T postgres psql -U postgres -d books_shop -c "SELECT 1;" > /dev/null 2>&1; then
    print_status "Database connection working"
else
    print_error "Database connection failed"
    exit 1
fi

# Test 3: Redis connection
echo -n "Testing Redis connection... "
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    print_status "Redis connection working"
else
    print_error "Redis connection failed"
    exit 1
fi

# Test 4: Schema validation
echo -n "Validating database schema... "
if docker-compose exec -T postgres psql -U postgres -d books_shop -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users';" | grep -q "id"; then
    print_status "Database schema is correct"
else
    print_error "Database schema validation failed"
    exit 1
fi

# Test 5: Container resource usage
echo -n "Checking container resource usage... "
container_count=$(docker-compose ps -q | wc -l)
if [ "$container_count" -eq 3 ]; then
    print_status "All 3 containers are running"
else
    print_warning "Expected 3 containers, found $container_count"
fi

echo -e "\n${GREEN}🎉 All validation tests passed!${NC}"
echo -e "\n${YELLOW}📊 Setup Summary:${NC}"
echo "- ✅ Docker build: Working"
echo "- ✅ PostgreSQL: Running with 'books_shop' database"
echo "- ✅ Redis: Running and accessible"
echo "- ✅ API: Running on http://localhost:3000"
echo "- ✅ Database schema: Applied successfully"
echo "- ✅ Health endpoint: Responding correctly"

echo -e "\n${YELLOW}🚀 Quick Start Commands:${NC}"
echo "  Start:  docker-compose up -d"
echo "  Stop:   docker-compose down"
echo "  Logs:   docker-compose logs -f api"
echo "  Shell:  docker-compose exec api sh"


echo -e "\n${GREEN}✨ The Docker setup is ready for the interview!${NC}"
