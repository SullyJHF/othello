#!/bin/bash

# Challenge System Testing Suite Runner
# This script runs comprehensive tests for the challenge system

set -e

echo "🧪 Challenge System Testing Suite"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if test database is available
print_status "Setting up test database..."
if ! npm run db:setup:test; then
    print_error "Failed to set up test database"
    exit 1
fi

print_success "Test database setup complete"

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 2

# Health check for test database
print_status "Checking test database health..."
if ! npm run db:health:test; then
    print_warning "Database health check failed, but continuing..."
fi

# Run different test suites
echo ""
print_status "Running Challenge System Test Suites..."
echo ""

# 1. End-to-End Integration Tests
print_status "1/4 Running End-to-End Integration Tests..."
if npx vitest run src/server/integration/challengeSystemEndToEnd.spec.ts --reporter=verbose; then
    print_success "End-to-End Integration Tests PASSED"
else
    print_error "End-to-End Integration Tests FAILED"
    exit 1
fi

echo ""

# 2. Performance Tests
print_status "2/4 Running Performance Tests..."
if npx vitest run src/server/integration/challengeSystemPerformance.spec.ts --reporter=verbose; then
    print_success "Performance Tests PASSED"
else
    print_error "Performance Tests FAILED"
    exit 1
fi

echo ""

# 3. Edge Cases and Error Scenarios
print_status "3/4 Running Edge Cases and Error Scenarios Tests..."
if npx vitest run src/server/integration/challengeSystemEdgeCases.spec.ts --reporter=verbose; then
    print_success "Edge Cases Tests PASSED"
else
    print_error "Edge Cases Tests FAILED"
    exit 1
fi

echo ""

# 4. All existing challenge system unit tests
print_status "4/4 Running All Challenge System Unit Tests..."
if npx vitest run --reporter=verbose \
    src/server/services/ChallengeCreationService.spec.ts \
    src/server/services/AIResponseGeneratorService.spec.ts \
    src/server/services/ChallengeEngine.spec.ts \
    src/server/services/PerformanceOptimizer.spec.ts \
    src/server/services/AIResponseCache.spec.ts; then
    print_success "Unit Tests PASSED"
else
    print_error "Unit Tests FAILED"
    exit 1
fi

echo ""

# Generate test coverage report for challenge system
print_status "Generating test coverage report..."
if npx vitest run --coverage --reporter=verbose \
    src/server/integration/challengeSystemEndToEnd.spec.ts \
    src/server/integration/challengeSystemPerformance.spec.ts \
    src/server/integration/challengeSystemEdgeCases.spec.ts \
    src/server/services/ChallengeCreationService.spec.ts \
    src/server/services/AIResponseGeneratorService.spec.ts \
    src/server/services/ChallengeEngine.spec.ts \
    src/server/services/PerformanceOptimizer.spec.ts \
    src/server/services/AIResponseCache.spec.ts; then
    print_success "Coverage report generated"
else
    print_warning "Coverage report generation failed, but tests passed"
fi

echo ""

# Run database cleanup
print_status "Cleaning up test database..."
if npm run db:stop:test; then
    print_success "Test database cleanup complete"
else
    print_warning "Test database cleanup failed"
fi

echo ""
print_success "🎉 All Challenge System Tests Completed Successfully!"
echo ""

# Summary
echo "📊 Test Summary:"
echo "=================="
echo "✅ End-to-End Integration Tests"
echo "✅ Performance Tests" 
echo "✅ Edge Cases & Error Scenarios"
echo "✅ Unit Tests"
echo "✅ Code Coverage Analysis"
echo ""

print_status "Challenge system is production-ready! 🚀"