# RAG Automated Test Suite

Comprehensive automated testing for RAG (Retrieval-Augmented Generation) semantic search functionality.

## Quick Start

### Option 1: Using npm (Recommended)

```bash
cd voice-designer
npm run test:rag
```

### Option 2: Using the bash script

```bash
cd voice-designer
./scripts/test-rag.sh
```

### Option 3: Direct execution

```bash
cd voice-designer
npx tsx scripts/test-rag-automated.ts
```

## What Gets Tested

The automated suite runs **comprehensive stress tests** covering:

### 1. Pre-Test Verification
- ✅ Verifies all 486 knowledge items have embeddings
- ✅ Checks database structure and completeness

### 2. Accuracy Tests (3 tests)
- **Semantic Similarity Detection**: Tests if RAG finds semantically similar items (not just keywords)
- **Cross-Category Search**: Verifies RAG spans multiple knowledge types for complex queries
- **Negative Match Prevention**: Ensures irrelevant queries don't return false positives

### 3. Performance Tests (2 tests)
- **Latency Measurement**: Validates average response time < 700ms
- **Concurrent Load Test**: Tests 10 simultaneous requests complete in < 5 seconds

### 4. Edge Case Tests (1 test)
- Tests empty strings, special characters, unicode, very long queries
- Verifies graceful error handling

### 5. Scale Tests (2 tests)
- **All Knowledge Types Coverage**: Validates all 5 types (avoid_word, preferred_word, auto_fix, festival, product_definition)
- **Severity Level Filtering**: Tests error/warning/info severity detection

### 6. Integration Tests (1 test)
- **Content Quality Enhancement**: Validates real-world scenario (entertainment notification)

**Total:** 10 comprehensive automated tests

## Output

### Console Output
Real-time progress with pass/fail indicators:
```
✅ Semantic Similarity Detection
   Tested 5 semantic queries. 5/5 passed
❌ Latency Measurement
   Avg: 850ms, Max: 1200ms, Min: 450ms
```

### Markdown Report
Detailed report generated at: `./RAG_TEST_REPORT.md`

Includes:
- Executive summary with success rate
- Per-category test results
- Detailed metrics (JSON format)
- Production readiness recommendation
- Specific failure details if any

## Success Criteria

**Production Ready** when:
- ✅ All 486 embeddings generated (0 unset)
- ✅ 100% test pass rate (10/10 tests)
- ✅ Average latency < 700ms
- ✅ All knowledge types searchable
- ✅ Content quality enhanced

## Duration

- **Quick smoke test**: ~2-3 minutes (basic validation)
- **Full comprehensive suite**: ~5-10 minutes (all tests)

Actual duration depends on:
- HuggingFace API response times
- Network latency
- Convex query performance

## Prerequisites

Before running tests:

1. **Convex must be running**
   ```bash
   npx convex dev  # In a separate terminal
   ```

2. **All embeddings must be generated**
   ```bash
   # Run until remaining: 0
   npx convex run embeddings:backfillEmbeddings
   ```

3. **Environment variables set**
   - `VITE_CONVEX_URL` in `.env.local` or environment
   - `HUGGINGFACE_API_KEY` in Convex dashboard

## Interpreting Results

### All Tests Pass ✅
```
🎉 All tests passed! RAG is production ready.
```
→ Safe to deploy to production

### Some Tests Fail ❌
```
⚠️ Some tests failed. Review the report for details.
```
→ Check `RAG_TEST_REPORT.md` for specific failures
→ Do NOT deploy until issues resolved

## Common Issues

### Error: "HUGGINGFACE_API_KEY not set"
**Solution:** Add API key to Convex dashboard
```bash
# Go to: https://dashboard.convex.dev/
# Settings → Environment Variables → Add HUGGINGFACE_API_KEY
```

### Error: "Cannot connect to Convex"
**Solution:** Start Convex dev server
```bash
npx convex dev
```

### Test fails: "Items without embeddings"
**Solution:** Complete embedding generation
```bash
# Run 9-10 times until all done
npx convex run embeddings:backfillEmbeddings
```

### Latency tests fail (> 700ms)
**Possible causes:**
- Slow network connection
- HuggingFace API under load
- Large query complexity

**Solutions:**
- Retry during off-peak hours
- Check HuggingFace status page
- Implement query caching (future optimization)

## Customization

### Adjust Test Parameters

Edit `scripts/test-rag-automated.ts`:

```typescript
// Change latency threshold
const passed = avgLatency < 700; // Change to 1000 for more lenient

// Change concurrent requests
const promises = Array(10).fill(null); // Change 10 to 5 or 20

// Add custom test queries
const testCases = [
  { query: 'Your custom query', expectedTypes: ['avoid_word'], minResults: 5 }
];
```

### Add New Tests

Add to the test runner:

```typescript
async function testMyCustomScenario(): Promise<{ passed: boolean; details: string; metrics: any }> {
  // Your test logic here
  return {
    passed: true,
    details: 'Test description',
    metrics: { /* your metrics */ }
  };
}

// In main():
await runTest('Custom Category', 'My Test Name', testMyCustomScenario);
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run RAG Tests
  working-directory: voice-designer
  env:
    VITE_CONVEX_URL: ${{ secrets.CONVEX_URL }}
  run: |
    npm run test:rag
    
- name: Upload Test Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: rag-test-report
    path: voice-designer/RAG_TEST_REPORT.md
```

## Troubleshooting

### TypeScript Errors
```bash
# Install tsx if missing
npm install -D tsx
```

### Module Not Found
```bash
# Ensure you're in voice-designer directory
cd voice-designer
npm install
```

### Permission Denied
```bash
chmod +x scripts/test-rag.sh
```

## Support

For issues or questions:
1. Check `RAG_TEST_REPORT.md` for detailed error messages
2. Review `RAG_DEPLOYMENT_CHECKLIST.md` for setup requirements
3. Check Convex logs: https://dashboard.convex.dev/ → Logs
4. Verify HuggingFace API status: https://status.huggingface.co/

---

**Last Updated:** February 2026
**Version:** 1.0.0
