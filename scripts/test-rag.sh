#!/bin/bash

#
# RAG Stress Test Runner
# Automated comprehensive testing for RAG functionality
#

set -e

echo "=================================="
echo " RAG Automated Stress Test Suite"
echo "=================================="
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from voice-designer directory"
  echo "   cd voice-designer && ./scripts/test-rag.sh"
  exit 1
fi

# Check if Convex URL is set
if [ -z "$VITE_CONVEX_URL" ]; then
  # Try to load from .env.local
  if [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | grep VITE_CONVEX_URL | xargs)
  fi
  
  if [ -z "$VITE_CONVEX_URL" ]; then
    echo "⚠️  Warning: VITE_CONVEX_URL not set"
    echo "   Using default from .env.example"
  fi
fi

echo "📍 Convex URL: ${VITE_CONVEX_URL:-<not set>}"
echo

# Run the automated test script
echo "🚀 Starting automated tests..."
echo "   This will take approximately 5-10 minutes"
echo

npx tsx scripts/test-rag-automated.ts

# Check exit code
if [ $? -eq 0 ]; then
  echo
  echo "✅ All tests passed!"
  echo "📄 Review the detailed report: RAG_TEST_REPORT.md"
  exit 0
else
  echo
  echo "❌ Some tests failed"
  echo "📄 Check the report for details: RAG_TEST_REPORT.md"
  exit 1
fi
