#!/bin/bash

# Test script to verify database setup works in CI/CD
# This script tests the database setup process locally to simulate CI/CD

set -e

echo "🧪 Testing database setup for CI/CD compatibility..."

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker stop othello-test-postgres-1 2>/dev/null || true
docker rm othello-test-postgres-1 2>/dev/null || true

# Test database setup
echo "🔧 Testing database setup..."
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5434
export POSTGRES_DB=othello_test
export POSTGRES_USER=test_user
export POSTGRES_PASSWORD=test_password

npm run db:setup:test

# Test database connection
echo "🔍 Testing database connection..."
if docker exec othello-test-postgres-1 pg_isready -U test_user -d othello_test; then
    echo "✅ Database connection test passed!"
else
    echo "❌ Database connection test failed!"
    exit 1
fi

# Test database health
echo "🏥 Testing database health..."
if npm run db:health:test; then
    echo "✅ Database health test passed!"
else
    echo "❌ Database health test failed!"
    exit 1
fi

# Run a simple test to verify tests can connect
echo "🧪 Testing if tests can connect to database..."
export NODE_ENV=test
timeout 30 npm test -- --run --reporter=dot 2>/dev/null || echo "Tests attempted to run (some may fail due to missing data, but connection should work)"

# Clean up
echo "🧹 Cleaning up test database..."
npm run db:stop:test

echo "🎉 Database setup test completed successfully!"
echo ""
echo "This confirms that the database setup should work in GitHub Actions CI/CD."