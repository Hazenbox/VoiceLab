# Mac-ToneStudio API Reference

This document describes the HTTP REST API endpoints available for the Mac-ToneStudio native app to interact with the Convex backend.

## Base URL

After deploying to Convex, the API is available at:

```
https://<your-deployment>.convex.site/api/
```

## Authentication

All endpoints require a `deviceId` for identification. The Mac app should:

1. Generate a unique device identifier on first launch
2. Store it securely in Keychain for persistence across app restarts
3. Include it in every API request

The `deviceId` can be passed via:
- Header: `X-Device-Id: <device-id>`
- Request body: `{ "deviceId": "<device-id>", ... }`
- Query parameter (GET requests): `?deviceId=<device-id>`

## Response Format

All responses follow this structure:

```json
// Success
{
  "data": { ... },
  "success": true
}

// Error
{
  "error": "Error message",
  "success": false
}
```

## CORS

All endpoints include CORS headers for cross-origin requests:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, X-Device-Id, Authorization`

---

## Endpoints

### Health Check

#### GET /api/health

Check if the API is running and get list of available endpoints.

**Response:**
```json
{
  "data": {
    "status": "healthy",
    "timestamp": 1708704000000,
    "version": "1.0.0",
    "endpoints": [
      "POST /api/users/authenticate",
      "POST /api/users/heartbeat",
      ...
    ]
  },
  "success": true
}
```

**Swift Example:**
```swift
func checkHealth() async throws -> HealthResponse {
    let url = URL(string: "\(baseURL)/api/health")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(APIResponse<HealthResponse>.self, from: data).data
}
```

---

### User Management

#### POST /api/users/authenticate

Create or update a user. Call this on app launch.

**Request Body:**
```json
{
  "deviceId": "mac-device-12345",
  "name": "John Doe",
  "role": "marketing",
  "product": "JioMart"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| deviceId | string | yes | Unique device identifier |
| name | string | no | User's display name (default: "Mac User") |
| role | string | no | User's role (default: "marketing") |
| product | string | no | Primary Jio product (default: "JioMart") |

**Response:**
```json
{
  "data": {
    "userId": "j123abc...",
    "deviceId": "mac-device-12345"
  },
  "success": true
}
```

**Swift Example:**
```swift
struct AuthRequest: Codable {
    let deviceId: String
    let name: String
    let role: String
    let product: String
}

func authenticate(deviceId: String, name: String, role: String, product: String) async throws -> String {
    var request = URLRequest(url: URL(string: "\(baseURL)/api/users/authenticate")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
    
    let body = AuthRequest(deviceId: deviceId, name: name, role: role, product: product)
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, _) = try await URLSession.shared.data(for: request)
    let response = try JSONDecoder().decode(APIResponse<AuthResponse>.self, from: data)
    return response.data.userId
}
```

---

#### POST /api/users/heartbeat

Update user's last seen timestamp. Call periodically (recommended: every 5 minutes when app is active).

**Request:**
- Header: `X-Device-Id: <device-id>`
- Or body: `{ "deviceId": "<device-id>" }`

**Response:**
```json
{
  "data": {
    "timestamp": 1708704000000
  },
  "success": true
}
```

**Swift Example:**
```swift
func sendHeartbeat(deviceId: String) async throws {
    var request = URLRequest(url: URL(string: "\(baseURL)/api/users/heartbeat")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
    request.httpBody = "{}".data(using: .utf8)
    
    let _ = try await URLSession.shared.data(for: request)
}
```

---

### Analytics

#### POST /api/analytics/log

Log a single analytics event.

**Request Body:**
```json
{
  "deviceId": "mac-device-12345",
  "eventType": "content_generated",
  "ecosystem": "JioMart",
  "channel": "WhatsApp",
  "persona": "friendly",
  "trustScore": 95,
  "tokenCount": 150,
  "llmProvider": "qwen"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| deviceId | string | yes | Device identifier |
| eventType | string | yes | Type of event (e.g., "content_generated", "feedback_submitted") |
| ecosystem | string | yes | Jio ecosystem (e.g., "JioMart", "JioFiber") |
| channel | string | yes | Communication channel (e.g., "WhatsApp", "Email") |
| persona | string | yes | Voice persona used |
| trustScore | number | no | Content trust score (0-100) |
| violationCount | number | no | Number of compliance violations |
| topViolations | string[] | no | List of violation types |
| tokenCount | number | no | Tokens used in generation |
| llmProvider | string | no | LLM provider used |

**Response:**
```json
{
  "data": {
    "logged": true,
    "timestamp": 1708704000000
  },
  "success": true
}
```

---

#### POST /api/analytics/batch

Log multiple analytics events at once. Use this for offline-first queuing.

**Request Body:**
```json
{
  "events": [
    {
      "deviceId": "mac-device-12345",
      "eventType": "content_generated",
      "ecosystem": "JioMart",
      "channel": "WhatsApp",
      "persona": "friendly",
      "timestamp": 1708704000000
    },
    {
      "deviceId": "mac-device-12345",
      "eventType": "feedback_submitted",
      "ecosystem": "JioMart",
      "channel": "WhatsApp",
      "persona": "friendly",
      "timestamp": 1708704001000
    }
  ]
}
```

**Constraints:**
- Maximum 100 events per batch
- Each event must have: deviceId, eventType, ecosystem, channel, persona

**Response:**
```json
{
  "data": {
    "logged": 2,
    "timestamp": 1708704002000
  },
  "success": true
}
```

**Swift Example (Offline Queue):**
```swift
class AnalyticsQueue {
    private var queue: [AnalyticsEvent] = []
    private let maxQueueSize = 1000
    
    func enqueue(_ event: AnalyticsEvent) {
        if queue.count >= maxQueueSize {
            queue.removeFirst()
        }
        queue.append(event)
        saveToStorage()
    }
    
    func flush(deviceId: String) async throws {
        guard !queue.isEmpty else { return }
        
        let events = Array(queue.prefix(100))
        var request = URLRequest(url: URL(string: "\(baseURL)/api/analytics/batch")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        
        let body = ["events": events]
        request.httpBody = try JSONEncoder().encode(body)
        
        let _ = try await URLSession.shared.data(for: request)
        
        queue.removeFirst(events.count)
        saveToStorage()
    }
}
```

---

### Knowledge Base

#### GET /api/knowledge

Get knowledge items for content generation prompt assembly.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ecosystem | string | yes | Jio ecosystem |
| channel | string | yes | Communication channel |
| limit | number | no | Max items to return (default: 100) |

**Request:**
```
GET /api/knowledge?ecosystem=JioMart&channel=WhatsApp&limit=50
```

**Response:**
```json
{
  "data": {
    "avoidPhrases": ["kindly note", "please be advised"],
    "preferPhrases": ["great question", "happy to help"],
    "vocabulary": ["Jio", "JioMart", "JioFiber"],
    "guidelines": [
      {
        "type": "tone",
        "content": "Always use active voice"
      }
    ]
  },
  "success": true
}
```

**Swift Example:**
```swift
func getKnowledge(ecosystem: String, channel: String) async throws -> Knowledge {
    var components = URLComponents(string: "\(baseURL)/api/knowledge")!
    components.queryItems = [
        URLQueryItem(name: "ecosystem", value: ecosystem),
        URLQueryItem(name: "channel", value: channel)
    ]
    
    let (data, _) = try await URLSession.shared.data(from: components.url!)
    return try JSONDecoder().decode(APIResponse<Knowledge>.self, from: data).data
}
```

---

#### GET /api/knowledge/counts

Get counts of knowledge items by type. Useful for caching decisions.

**Response:**
```json
{
  "data": {
    "avoid": { "active": 45, "total": 50 },
    "prefer": { "active": 30, "total": 35 },
    "vocabulary": { "active": 100, "total": 120 }
  },
  "success": true
}
```

---

### Token Enforcement

#### GET /api/enforcement/rules

Get all active token enforcement (brand safety) rules.

**Response:**
```json
{
  "data": [
    {
      "_id": "abc123",
      "pattern": "competitor",
      "type": "block",
      "description": "Block competitor mentions",
      "isActive": true
    },
    {
      "_id": "def456",
      "pattern": "discount",
      "type": "review",
      "description": "Flag discount claims",
      "isActive": true
    }
  ],
  "success": true
}
```

**Swift Example with Caching:**
```swift
class EnforcementRulesCache {
    private var rules: [EnforcementRule] = []
    private var lastFetch: Date?
    private let cacheDuration: TimeInterval = 300 // 5 minutes
    
    func getRules(deviceId: String) async throws -> [EnforcementRule] {
        if let lastFetch = lastFetch,
           Date().timeIntervalSince(lastFetch) < cacheDuration {
            return rules
        }
        
        var request = URLRequest(url: URL(string: "\(baseURL)/api/enforcement/rules")!)
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(APIResponse<[EnforcementRule]>.self, from: data)
        
        rules = response.data
        lastFetch = Date()
        
        return rules
    }
}
```

---

### Training Examples

#### GET /api/examples

Get high-quality training examples for few-shot prompting.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ecosystem | string | no | Filter by ecosystem |
| channel | string | no | Filter by channel |
| limit | number | no | Max examples (default: 20) |

**Response:**
```json
{
  "data": [
    {
      "input": "Write a message about delivery delay",
      "output": "We're sorry your order is taking longer than expected...",
      "ecosystem": "JioMart",
      "channel": "WhatsApp",
      "quality": "high"
    }
  ],
  "success": true
}
```

---

### Feedback

#### POST /api/feedback

Submit user feedback on generated content.

**Request Body:**
```json
{
  "deviceId": "mac-device-12345",
  "feedbackType": "edit",
  "messageContent": "Generated content here",
  "originalContent": "Original generated content",
  "editedContent": "User-edited version",
  "comment": "Changed tone to be more formal",
  "ecosystem": "JioMart",
  "channel": "WhatsApp",
  "persona": "friendly"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| deviceId | string | yes | Device identifier |
| feedbackType | string | yes | "thumbs_up", "thumbs_down", "edit", or "comment" |
| messageContent | string | yes | The content being rated |
| originalContent | string | no | Original before any edits |
| editedContent | string | no | User's edited version (for "edit" type) |
| comment | string | no | User's comment |
| reasons | string[] | no | Reasons for feedback |
| ecosystem | string | yes | Jio ecosystem |
| channel | string | yes | Communication channel |
| persona | string | yes | Voice persona |
| trustScore | number | no | Content trust score |

**Response:**
```json
{
  "data": {
    "submitted": true,
    "timestamp": 1708704000000
  },
  "success": true
}
```

---

#### GET /api/corrections/learning

Get learning corrections (patterns learned from user feedback).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ecosystem | string | yes | Jio ecosystem |
| channel | string | yes | Communication channel |
| limit | number | no | Max corrections (default: 50) |

**Response:**
```json
{
  "data": [
    {
      "pattern": "We apologize for",
      "replacement": "We're sorry for",
      "frequency": 15,
      "confidence": 0.95
    }
  ],
  "success": true
}
```

---

### Directives

#### GET /api/directives

Get directive overrides for a specific ecosystem/channel.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ecosystem | string | yes | Jio ecosystem |
| channel | string | yes | Communication channel |

**Response:**
```json
{
  "data": [
    {
      "directive": "Keep responses under 100 words",
      "priority": 1,
      "isActive": true
    }
  ],
  "success": true
}
```

---

## Swift Integration Guide

### API Client Setup

```swift
import Foundation

class ToneStudioAPIClient {
    let baseURL: String
    let deviceId: String
    
    init(baseURL: String, deviceId: String) {
        self.baseURL = baseURL
        self.deviceId = deviceId
    }
    
    private func request<T: Decodable>(_ endpoint: String, method: String = "GET", body: Encodable? = nil) async throws -> T {
        var request = URLRequest(url: URL(string: "\(baseURL)\(endpoint)")!)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        
        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.requestFailed
        }
        
        let apiResponse = try JSONDecoder().decode(APIResponse<T>.self, from: data)
        return apiResponse.data
    }
}
```

### Keychain Storage for DeviceId

```swift
import Security

class KeychainHelper {
    static let shared = KeychainHelper()
    
    func save(deviceId: String) -> Bool {
        let data = Data(deviceId.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "com.tonestudio.deviceId",
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func getDeviceId() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "com.tonestudio.deviceId",
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }
        
        return String(data: data, encoding: .utf8)
    }
    
    func getOrCreateDeviceId() -> String {
        if let existing = getDeviceId() {
            return existing
        }
        
        let newId = "mac-\(UUID().uuidString)"
        _ = save(deviceId: newId)
        return newId
    }
}
```

---

## Error Handling

Common error responses:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Missing required fields | Request is missing required parameters |
| 400 | Invalid feedbackType | feedbackType must be one of the allowed values |
| 500 | Internal server error | Server-side error, retry with exponential backoff |

**Swift Error Handling:**
```swift
enum APIError: Error {
    case missingDeviceId
    case invalidResponse
    case requestFailed
    case serverError(String)
}

extension ToneStudioAPIClient {
    func handleError(_ error: Error) {
        switch error {
        case APIError.serverError(let message):
            // Log and retry with backoff
            print("Server error: \(message)")
        default:
            print("Request failed: \(error)")
        }
    }
}
```

---

## Rate Limiting

The API implements rate limiting per device:
- **Standard endpoints**: 100 requests/minute
- **Batch endpoints**: 10 requests/minute (but each can contain up to 100 events)

When rate limited, you'll receive a 429 response. Implement exponential backoff in your client.

---

## Offline Support

For offline-first operation:

1. **Queue events locally** using CoreData or UserDefaults
2. **Monitor network status** using `NWPathMonitor`
3. **Flush queue** when network becomes available
4. **Use batch endpoints** to minimize API calls

```swift
import Network

class NetworkMonitor {
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")
    
    var isConnected: Bool = false
    var onConnectionRestored: (() -> Void)?
    
    func start() {
        monitor.pathUpdateHandler = { [weak self] path in
            let wasDisconnected = !(self?.isConnected ?? true)
            self?.isConnected = path.status == .satisfied
            
            if wasDisconnected && path.status == .satisfied {
                self?.onConnectionRestored?()
            }
        }
        monitor.start(queue: queue)
    }
}
```
