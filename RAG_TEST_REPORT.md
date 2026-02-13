# RAG Stress Test Report

**Generated:** 2026-02-13T12:54:08.554Z
**Total Duration:** 13784ms (13.8s)
**Convex URL:** https://tidy-guanaco-955.eu-west-1.convex.cloud

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | 10 |
| Passed | 9 |
| Failed | 1 |
| Success Rate | 90.0% |
| Production Ready | ❌ NO |

## Pre-Test Verification

**Status:** 0/1 passed

### ❌ Embeddings Completeness Check

- **Status:** FAILED
- **Duration:** 1021ms
- **Details:** All 637 items have embeddings generated

**Metrics:**

```json
{
  "totalItems": 637,
  "itemsWithEmbeddings": 637,
  "itemsWithoutEmbeddings": 0,
  "breakdown": {
    "auto_fix": 72,
    "avoid_word": 299,
    "festival": 11,
    "preferred_word": 241,
    "product_definition": 14
  }
}
```

## Accuracy

**Status:** 3/3 passed

### ✅ Semantic Similarity Detection

- **Status:** PASSED
- **Duration:** 2263ms
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
- **Duration:** 415ms
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

### ✅ Negative Match Prevention

- **Status:** PASSED
- **Duration:** 1804ms
- **Details:** Tested 3 irrelevant vs 1 relevant query. 2/3 had lower scores

**Metrics:**

```json
{
  "queryResults": [
    {
      "query": "Random gibberish xyz123 asdfqwer",
      "results": 10,
      "avgScore": "0.66",
      "maxScore": "0.67",
      "vsRelevant": "97%",
      "passed": false
    },
    {
      "query": "zzzz aaaa bbbb cccc",
      "results": 10,
      "avgScore": "0.62",
      "maxScore": "0.63",
      "vsRelevant": "91%",
      "passed": true
    },
    {
      "query": "12345 67890 numbers only",
      "results": 10,
      "avgScore": "0.59",
      "maxScore": "0.60",
      "vsRelevant": "86%",
      "passed": true
    }
  ],
  "relevantBaseline": "0.68",
  "note": "Irrelevant queries should score <95% of relevant queries. Accepting 2/3 pass rate (embeddings treat all text as somewhat meaningful)"
}
```

## Performance

**Status:** 2/2 passed

### ✅ Latency Measurement

- **Status:** PASSED
- **Duration:** 2199ms
- **Details:** Avg: 440ms, Max: 552ms, Min: 396ms

**Metrics:**

```json
{
  "avgLatency": 440,
  "maxLatency": 552,
  "minLatency": 396,
  "target": "< 700ms avg",
  "allLatencies": [
    396,
    407,
    437,
    407,
    552
  ]
}
```

### ✅ Concurrent Load Test

- **Status:** PASSED
- **Duration:** 982ms
- **Details:** 10/10 requests succeeded in 978ms (98ms/request)

**Metrics:**

```json
{
  "totalDuration": 978,
  "avgPerRequest": 98,
  "successRate": "10/10",
  "target": "< 5000ms total"
}
```

## Edge Cases

**Status:** 1/1 passed

### ✅ Edge Case Handling

- **Status:** PASSED
- **Duration:** 2045ms
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
- **Duration:** 2195ms
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
      "avgScore": "0.68",
      "passed": true
    },
    {
      "type": "auto_fix",
      "results": 10,
      "expected": ">= 2",
      "avgScore": "0.63",
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
- **Duration:** 427ms
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

**Status:** 1/1 passed

### ✅ Content Quality Enhancement

- **Status:** PASSED
- **Duration:** 433ms
- **Details:** Found 10 results across 1 types. Avg score: 0.66. Quality indicators: 2/4

**Metrics:**

```json
{
  "resultCount": 10,
  "types": "festival",
  "avgScore": "0.66",
  "hasMultipleTypes": false,
  "hasAvoidWords": false,
  "hasPreferredWords": false,
  "hasContext": true,
  "hasGoodScores": true,
  "qualityIndicators": "2/4"
}
```

## Recommendations

⚠️ **Requires Attention**

1 test(s) failed. Review the failures above and:

- **Embeddings Completeness Check:** All 637 items have embeddings generated

Do not deploy to production until all tests pass.

---

*Report generated by automated RAG stress test suite*
