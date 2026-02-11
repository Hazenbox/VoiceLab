# RAG Stress Test Report

**Generated:** 2026-02-11T12:57:26.148Z
**Total Duration:** 18507ms (18.5s)
**Convex URL:** https://tidy-guanaco-955.eu-west-1.convex.cloud

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | 10 |
| Passed | 7 |
| Failed | 3 |
| Success Rate | 70.0% |
| Production Ready | ❌ NO |

## Pre-Test Verification

**Status:** 0/1 passed

### ❌ Embeddings Completeness Check

- **Status:** FAILED
- **Duration:** 998ms
- **Details:** Test threw error: [Request ID: 1bf5ec7765eb8421] Server Error
Could not find public function for 'embeddings:getItemsWithoutEmbeddings'. Did you forget to run `npx convex dev` or `npx convex deploy`?


## Accuracy

**Status:** 2/3 passed

### ✅ Semantic Similarity Detection

- **Status:** PASSED
- **Duration:** 5926ms
- **Details:** Tested 5 semantic queries. 5/5 passed

**Metrics:**

```json
{
  "caseResults": [
    {
      "query": "How to sound less corporate?",
      "results": 10,
      "avgScore": "0.58",
      "types": "avoid_word, auto_fix, preferred_word",
      "passed": true
    },
    {
      "query": "Make it more welcoming",
      "results": 10,
      "avgScore": "0.63",
      "types": "auto_fix, festival, preferred_word",
      "passed": true
    },
    {
      "query": "Avoid sounding pushy",
      "results": 10,
      "avgScore": "0.68",
      "types": "avoid_word",
      "passed": true
    },
    {
      "query": "Premium luxury features",
      "results": 10,
      "avgScore": "0.55",
      "types": "product_definition, avoid_word, festival, preferred_word",
      "passed": true
    },
    {
      "query": "Entertainment and movies",
      "results": 10,
      "avgScore": "0.56",
      "types": "product_definition, festival",
      "passed": true
    }
  ]
}
```

### ✅ Cross-Category Search

- **Status:** PASSED
- **Duration:** 437ms
- **Details:** Found 10 results across 3 types and 4 categories

**Metrics:**

```json
{
  "resultCount": 10,
  "types": "auto_fix, festival, preferred_word",
  "categories": "gender_neutral, pan_india, community_first, regional",
  "avgScore": "0.66"
}
```

### ❌ Negative Match Prevention

- **Status:** FAILED
- **Duration:** 1322ms
- **Details:** Tested 3 irrelevant queries. 0/3 correctly returned few/no results

**Metrics:**

```json
{
  "queryResults": [
    {
      "query": "Random gibberish xyz123 asdfqwer",
      "results": 10,
      "maxScore": "0.66",
      "passed": false
    },
    {
      "query": "zzzz aaaa bbbb cccc",
      "results": 10,
      "maxScore": "0.63",
      "passed": false
    },
    {
      "query": "12345 67890 numbers only",
      "results": 10,
      "maxScore": "0.60",
      "passed": false
    }
  ]
}
```

## Performance

**Status:** 2/2 passed

### ✅ Latency Measurement

- **Status:** PASSED
- **Duration:** 2492ms
- **Details:** Avg: 498ms, Max: 529ms, Min: 445ms

**Metrics:**

```json
{
  "avgLatency": 498,
  "maxLatency": 529,
  "minLatency": 445,
  "target": "< 700ms avg",
  "allLatencies": [
    445,
    472,
    523,
    529,
    521
  ]
}
```

### ✅ Concurrent Load Test

- **Status:** PASSED
- **Duration:** 1243ms
- **Details:** 10/10 requests succeeded in 1238ms (124ms/request)

**Metrics:**

```json
{
  "totalDuration": 1238,
  "avgPerRequest": 124,
  "successRate": "10/10",
  "target": "< 5000ms total"
}
```

## Edge Cases

**Status:** 1/1 passed

### ✅ Edge Case Handling

- **Status:** PASSED
- **Duration:** 2429ms
- **Details:** Tested 5 edge cases. 5/5 handled correctly

**Metrics:**

```json
{
  "caseResults": [
    {
      "name": "Empty string",
      "handled": true,
      "results": 10,
      "passed": true
    },
    {
      "name": "Special characters",
      "handled": true,
      "results": 10,
      "passed": true
    },
    {
      "name": "Unicode/emoji",
      "handled": true,
      "results": 10,
      "passed": true
    },
    {
      "name": "Very long query",
      "handled": true,
      "results": 10,
      "passed": true
    },
    {
      "name": "Single character",
      "handled": true,
      "results": 10,
      "passed": true
    }
  ]
}
```

## Scale

**Status:** 2/2 passed

### ✅ All Knowledge Types Coverage

- **Status:** PASSED
- **Duration:** 2634ms
- **Details:** Tested all 5 knowledge types. 5/5 types returned sufficient results

**Metrics:**

```json
{
  "typeResults": [
    {
      "type": "avoid_word",
      "results": 10,
      "expected": ">= 5",
      "avgScore": "0.75",
      "passed": true
    },
    {
      "type": "preferred_word",
      "results": 10,
      "expected": ">= 5",
      "avgScore": "0.67",
      "passed": true
    },
    {
      "type": "auto_fix",
      "results": 10,
      "expected": ">= 2",
      "avgScore": "0.62",
      "passed": true
    },
    {
      "type": "festival",
      "results": 10,
      "expected": ">= 1",
      "avgScore": "0.70",
      "passed": true
    },
    {
      "type": "product_definition",
      "results": 10,
      "expected": ">= 1",
      "avgScore": "0.62",
      "passed": true
    }
  ]
}
```

### ✅ Severity Level Filtering

- **Status:** PASSED
- **Duration:** 502ms
- **Details:** Found 19 error, 1 warning, 0 info severity items

**Metrics:**

```json
{
  "severityCounts": {
    "error": 19,
    "warning": 1,
    "info": 0
  },
  "totalAvoidWords": 20,
  "totalResults": 20
}
```

## Integration

**Status:** 0/1 passed

### ❌ Content Quality Enhancement

- **Status:** FAILED
- **Duration:** 524ms
- **Details:** Found 10 results. Quality indicators: entertainment=false, preferred=false, avoid-elitist=false

**Metrics:**

```json
{
  "resultCount": 10,
  "hasEntertainment": false,
  "hasPreferredWords": false,
  "hasAvoidElitist": false,
  "qualityScore": "0/3"
}
```

## Recommendations

⚠️ **Requires Attention**

3 test(s) failed. Review the failures above and:

- **Embeddings Completeness Check:** Test threw error: [Request ID: 1bf5ec7765eb8421] Server Error
Could not find public function for 'embeddings:getItemsWithoutEmbeddings'. Did you forget to run `npx convex dev` or `npx convex deploy`?

- **Negative Match Prevention:** Tested 3 irrelevant queries. 0/3 correctly returned few/no results
- **Content Quality Enhancement:** Found 10 results. Quality indicators: entertainment=false, preferred=false, avoid-elitist=false

Do not deploy to production until all tests pass.

---

*Report generated by automated RAG stress test suite*
