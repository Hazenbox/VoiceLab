# Voice Lab - Team Deployment Architecture

## System Overview

Voice Lab is a multi-tenant content generation platform with real-time collaboration, centralized feedback, and shared learning across teams.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USERS (Teams)                                │
│  Marketing │ Product │ UX Writers │ Sales │ Support │ Leadership   │
└────────────┬─────────────────────────────────────────────────┬──────┘
             │                                                  │
             │ HTTPS                                            │ HTTPS
             │                                                  │
             ▼                                                  ▼
┌────────────────────────────────────────┐    ┌─────────────────────────┐
│     VERCEL DEPLOYMENT                  │    │   ADMIN PORTAL          │
│                                        │    │   /admin/*              │
│  ┌──────────────────────────────────┐ │    │                         │
│  │  Frontend (React + Vite)         │ │    │  ┌───────────────────┐ │
│  │  - Voice chat interface          │ │    │  │ Dashboard         │ │
│  │  - Content generation            │ │    │  │ Analytics         │ │
│  │  - Real-time validation          │ │    │  │ Memory & Learning │ │
│  │  - Trust score display           │ │    │  │ Knowledge Base    │ │
│  │  - Design system (Jio DS)        │ │    │  │ User Management   │ │
│  └──────────────┬───────────────────┘ │    │  └───────────────────┘ │
│                 │                      │    └────────┬────────────────┘
│                 │ WebSocket            │             │
│  ┌──────────────▼───────────────────┐ │             │
│  │  API Routes (Serverless)         │ │             │ Convex Queries
│  │  /api/tts      - Text-to-Speech  │ │             │
│  │  /api/llm      - LLM Proxy       │ │             │
│  │  /api/gemini   - Gemini Chat     │ │             │
│  │  /api/openai   - OpenAI          │ │             │
│  │  /api/claude   - Anthropic       │ │             │
│  │  /api/huggingface - HF Models    │ │             │
│  └──────────────────────────────────┘ │             │
└────────────────┬───────────────────────┘             │
                 │                                     │
                 │ Convex Client SDK                   │
                 └─────────────────┬───────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │      CONVEX CLOUD                │
                    │   (Shared Database + Functions)  │
                    │                                  │
                    │  ┌────────────────────────────┐ │
                    │  │  TABLES                    │ │
                    │  │  • users                   │ │
                    │  │  • corrections             │ │
                    │  │  • analyticsEvents         │ │
                    │  │  • knowledgeItems          │ │
                    │  │  • adminConfig             │ │
                    │  └────────────────────────────┘ │
                    │                                  │
                    │  ┌────────────────────────────┐ │
                    │  │  FUNCTIONS (Queries)       │ │
                    │  │  • users.listAll           │ │
                    │  │  • corrections.listAll     │ │
                    │  │  • knowledge.getForPrompt  │ │
                    │  │  • analytics.summary       │ │
                    │  └────────────────────────────┘ │
                    │                                  │
                    │  ┌────────────────────────────┐ │
                    │  │  FUNCTIONS (Mutations)     │ │
                    │  │  • users.createOrUpdate    │ │
                    │  │  • corrections.submit      │ │
                    │  │  • knowledge.add           │ │
                    │  │  • analytics.track         │ │
                    │  └────────────────────────────┘ │
                    │                                  │
                    │  ┌────────────────────────────┐ │
                    │  │  VECTOR SEARCH (Phase 4)   │ │
                    │  │  • embeddings.semanticSearch│ │
                    │  │  • 384-dim vectors (MiniLM)│ │
                    │  └────────────────────────────┘ │
                    └──────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            ┌──────────┐   ┌──────────┐   ┌──────────┐
            │ Team A   │   │ Team B   │   │ Team C   │
            │ Marketing│   │ Product  │   │ UX/Sales │
            └──────────┘   └──────────┘   └──────────┘
```

---

## Data Flow

### 1. User Onboarding

```
User visits app (first time)
  │
  ├─► Onboarding Modal appears
  │   └─► User enters: name, role, ecosystem
  │
  ├─► Frontend generates deviceId (localStorage)
  │
  └─► Convex Mutation: users.createOrUpdate
      └─► User profile stored in Convex
          └─► Profile available across devices (same deviceId)
```

### 2. Content Generation

```
User requests content generation
  │
  ├─► Frontend: Build context (ecosystem, channel, persona)
  │   │
  │   ├─► Convex Query: knowledge.getForPrompt
  │   │   └─► Returns: avoid words, preferred terms, auto-fix rules
  │   │
  │   ├─► Convex Query: corrections.getLearningCorrections
  │   │   └─► Returns: approved user edits and feedback
  │   │
  │   └─► Build enriched prompt with context + knowledge
  │
  ├─► API Route: /api/llm (or /api/gemini)
  │   └─► LLM generates content
  │
  ├─► Frontend: Validate content
  │   ├─► Check avoid words
  │   ├─► Check brand compliance
  │   └─► Calculate trust score
  │
  └─► Display content with trust score and violations
```

### 3. User Feedback Loop

```
User gives feedback (thumbs up/down, edit, comment)
  │
  ├─► Frontend: Capture feedback + generation context
  │
  ├─► Convex Mutation: corrections.submit
  │   └─► Store: content, feedback type, ecosystem, channel, trust score
  │
  ├─► Convex Mutation: analytics.track
  │   └─► Store: event type, user, ecosystem, channel, timestamp
  │
  └─► Admin sees new feedback in real-time (reactive queries)
      │
      ├─► Admin reviews in /admin/memory
      │   └─► Approve/Reject corrections
      │
      └─► Approved corrections feed into future prompts
          └─► Shared learning across all users!
```

### 4. Admin Workflow

```
Admin visits /admin
  │
  ├─► Convex Query: corrections.listAll
  │   └─► Returns: all user feedback (paginated)
  │
  ├─► Convex Query: analytics.summary
  │   └─► Returns: aggregated stats by ecosystem/channel/persona
  │
  ├─► Convex Query: knowledge.countByType
  │   └─► Returns: counts of avoid words, products, rules
  │
  └─► Admin actions:
      │
      ├─► Approve/Reject correction
      │   └─► Convex Mutation: corrections.updateAdminStatus
      │
      ├─► Add new knowledge item
      │   └─► Convex Mutation: knowledge.add
      │
      └─► View analytics dashboard
          └─► Real-time charts and insights
```

---

## Component Architecture

### Frontend (React + Vite)

```
src/
├── components/
│   ├── AIOrb.tsx              # Animated voice orb
│   ├── OnboardingModal.tsx     # First-time user setup
│   ├── ContentContextSelector.tsx # Ecosystem/channel picker
│   ├── TrustContextPanel.tsx   # Validation results display
│   └── admin/
│       ├── AdminDashboard.tsx  # Overview metrics
│       ├── AdminAnalytics.tsx  # Usage charts
│       ├── AdminMemory.tsx     # Feedback review
│       └── AdminKnowledge.tsx  # Vocabulary management
│
├── services/
│   ├── prompt/                 # Prompt engineering
│   │   ├── buildPrompt.ts      # Main prompt builder
│   │   └── basePersona.ts      # Conversational mode
│   │
│   ├── validation/             # Content validation
│   │   ├── validationPipeline.ts
│   │   └── agents/             # Specialized validators
│   │
│   ├── trust/                  # Trust scoring
│   │   ├── calculateTrustScore.ts
│   │   └── autoFixEngine.ts
│   │
│   ├── knowledge/              # Knowledge retrieval
│   │   ├── retrieveKnowledge.ts
│   │   └── saveExample.ts
│   │
│   ├── sync/                   # Convex integration
│   │   └── convexSync.ts       # Background sync service
│   │
│   └── providers/              # LLM/TTS providers
│       ├── llm/                # LLM orchestration
│       ├── tts/                # Text-to-speech
│       └── conversation/       # Voice chat
│
└── main.tsx                    # App entry + Convex setup
```

### Backend (Convex Functions)

```
convex/
├── schema.ts                   # Database schema
│
├── users.ts                    # User management
│   ├── createOrUpdate()
│   ├── getByDeviceId()
│   ├── heartbeat()
│   └── listAll()
│
├── corrections.ts              # Feedback & corrections
│   ├── submit()
│   ├── listAll()
│   ├── updateAdminStatus()
│   └── getLearningCorrections()
│
├── knowledge.ts                # Knowledge base
│   ├── getForPrompt()
│   ├── add()
│   ├── update()
│   ├── countByType()
│   └── listAll()
│
├── analytics.ts                # Event tracking
│   ├── track()
│   ├── summary()
│   └── getByDateRange()
│
├── embeddings.ts               # Vector search (Phase 4)
│   ├── semanticSearch()
│   └── generateEmbedding()
│
└── seed.ts                     # Initial data seeding
    └── runSeed()
```

---

## Database Schema

### users
```typescript
{
  _id: Id<"users">,
  deviceId: string,          // Unique per device/browser
  name: string,              // User's name
  role: string,              // marketing | product | ux_writer | sales | support | leadership
  product: string,           // Primary ecosystem (JioFiber, JioMart, etc.)
  createdAt: number,         // Timestamp
  lastSeenAt: number,        // Last activity timestamp
}
// Indexes: by_deviceId, by_role, by_lastSeenAt
```

### corrections
```typescript
{
  _id: Id<"corrections">,
  userId: Id<"users">,
  deviceId: string,
  messageContent: string,     // AI-generated content
  originalContent: string,    // Original version
  editedContent?: string,     // User's edit (if applicable)
  feedbackType: string,       // thumbs_up | thumbs_down | edit | comment
  comment?: string,           // User's comment
  reasons?: string[],         // Structured dislike reasons
  ecosystem: string,          // JioFiber, JioMart, etc.
  channel: string,            // Social, Website, App, Email, etc.
  persona: string,            // Professional, Friendly, etc.
  trustScore?: number,        // 0-100
  generationContext?: string, // JSON stringified context
  adminStatus?: string,       // pending | approved | rejected
  timestamp: number,
}
// Indexes: by_userId, by_ecosystem_channel, by_timestamp, by_adminStatus, by_feedbackType
```

### knowledgeItems
```typescript
{
  _id: Id<"knowledgeItems">,
  type: string,               // avoid_word | preferred_word | product_definition | festival | auto_fix | approved_example
  category: string,           // Sub-category within type
  content: string,            // The actual rule/word/example
  metadata: {
    ecosystem?: string,
    channel?: string,
    persona?: string,
    severity?: string,        // error | warning | info
    suggestion?: string,      // Suggested replacement
    source?: string,          // system_v1 | admin_manual | user_correction
  },
  tags: string[],
  isActive: boolean,
  createdBy?: string,         // deviceId or "system"
  createdAt: number,
  updatedAt: number,
  embedding?: number[],       // 384-dim vector (Phase 4)
}
// Indexes: by_type, by_type_active, by_category, by_type_category
// Vector Index: by_embedding (384 dimensions, filters on type/category/isActive)
```

### analyticsEvents
```typescript
{
  _id: Id<"analyticsEvents">,
  userId: Id<"users">,
  deviceId: string,
  eventType: string,          // generation | feedback | session_start
  ecosystem: string,
  channel: string,
  persona: string,
  trustScore?: number,
  violationCount?: number,
  topViolations?: string[],
  userAction?: string,        // accepted | edited | rejected
  tokenCount?: number,
  llmProvider?: string,
  timestamp: number,
}
// Indexes: by_timestamp, by_ecosystem, by_userId, by_eventType, by_persona
```

### adminConfig
```typescript
{
  _id: Id<"adminConfig">,
  key: string,                // trust_threshold | feature_flags | llm_defaults
  value: string,              // JSON stringified value
  updatedAt: number,
  updatedBy?: string,         // Admin deviceId
}
// Index: by_key
```

---

## Security & Privacy

### Authentication
- **No traditional auth**: Uses device ID (localStorage)
- **Admin access**: Passphrase-protected (`VITE_ADMIN_PASSPHRASE`)
- **Future**: Add OAuth/SSO for production

### Data Privacy
- **PII**: Only stores name, role, and device ID (no email, phone)
- **GDPR**: Data can be deleted by device ID
- **Anonymization**: Analytics aggregates by role/ecosystem, not individual users

### API Security
- **Server-side keys**: API keys stored in Vercel env vars (no `VITE_` prefix)
- **CORS**: Configured for specific origins only
- **Rate limiting**: Applied in API routes
- **Validation**: Input validation on all API endpoints

### Convex Security
- **Read access**: All users can query public functions
- **Write access**: Authenticated via Convex client SDK
- **Admin actions**: Gated by business logic in functions
- **Audit log**: All mutations tracked with user/device ID

---

## Scalability Considerations

### Current Architecture (50-200 users)
- **Convex**: Hobby tier ($25/month) handles 10M calls/month
- **Vercel**: Free tier supports moderate traffic
- **LLM APIs**: Pay-per-use, scales automatically

### Future Scaling (1000+ users)
- **Convex**: Upgrade to Pro tier ($65/month) for 100M calls
- **Vercel**: Upgrade to Pro ($20/month) for higher bandwidth
- **Caching**: Add Redis/Upstash for response caching
- **CDN**: Leverage Vercel Edge for global distribution
- **Monitoring**: Add Sentry for error tracking, Mixpanel for product analytics

---

## Deployment Environments

### Local Development
```
Environment: development
Convex: dev:tidy-guanaco-955
URL: http://localhost:3002
Features: All enabled (testing)
API Keys: Development keys
```

### Staging (Preview Deployments)
```
Environment: preview
Convex: dev:tidy-guanaco-955 (shared with dev)
URL: https://voice-lab-*.vercel.app
Features: All enabled
API Keys: Development keys
```

### Production (Team Testing)
```
Environment: production
Convex: prod:ideal-marlin-985
URL: https://voice-lab.vercel.app
Features: All enabled (required)
API Keys: Production keys
```

---

## Monitoring & Observability

### Convex Dashboard
- Function call logs
- Database query performance
- Storage usage
- Error rates

### Vercel Dashboard
- Deployment status
- Build logs
- Function logs
- Bandwidth usage

### Admin Panel (`/admin`)
- User activity metrics
- Feedback summary
- Trust score trends
- Knowledge base coverage

### Sentry (Optional)
- Frontend error tracking
- Performance monitoring
- User session replay
- Release tracking

---

## Future Enhancements

### Phase 5: Advanced Features
- **SSO Integration**: Google/Microsoft OAuth
- **Team Workspaces**: Isolated data per team
- **A/B Testing**: Compare prompt variations
- **Batch Operations**: Bulk content generation
- **Export/Import**: Knowledge base management

### Phase 6: Production Scale
- **Multi-region**: Deploy closer to users
- **Advanced Caching**: CDN + Redis for faster responses
- **Real-time Collaboration**: Live editing with conflict resolution
- **API Access**: RESTful API for external integrations
- **Mobile App**: Native iOS/Android apps

---

## Cost Breakdown (Monthly)

### Small Team (50 users)
| Service | Usage | Cost |
|---------|-------|------|
| Convex | 1M calls | $0 (Free) |
| Vercel | 50GB bandwidth | $0 (Free) |
| DashScope | 25K requests | $25 |
| Gemini | 10K requests | $10 |
| HuggingFace | Unlimited | $0 (Free) |
| **Total** | | **$35/month** |

### Medium Team (200 users)
| Service | Usage | Cost |
|---------|-------|------|
| Convex | 5M calls | $25 (Hobby) |
| Vercel | 200GB bandwidth | $0 (Free) |
| DashScope | 100K requests | $100 |
| Gemini | 40K requests | $40 |
| HuggingFace | Unlimited | $0 (Free) |
| **Total** | | **$165/month** |

### Large Team (1000+ users)
| Service | Usage | Cost |
|---------|-------|------|
| Convex | 50M calls | $65 (Pro) |
| Vercel | 1TB bandwidth | $20 (Pro) |
| DashScope | 500K requests | $500 |
| Gemini | 200K requests | $200 |
| Sentry | Error tracking | $26 (Team) |
| **Total** | | **$811/month** |

*Actual costs vary based on usage patterns. Free tiers may suffice for testing.*

---

## Technical Stack Summary

### Frontend
- **Framework**: React 19 + Vite 7
- **Language**: TypeScript 5.9
- **Design System**: Jio Design System (`@marcelinodzn/ds-react`)
- **State Management**: React hooks + Convex queries
- **Routing**: React Router 7
- **Styling**: Tailwind CSS 4 + CSS modules

### Backend
- **Database**: Convex (serverless, real-time)
- **API**: Vercel Serverless Functions
- **Authentication**: Device ID (localStorage)
- **Vector Search**: Convex vector indexes (Phase 4)

### Infrastructure
- **Hosting**: Vercel (CDN + Edge Functions)
- **Database**: Convex Cloud
- **Monitoring**: Sentry (optional)
- **CI/CD**: GitHub Actions + Vercel auto-deploy

### External APIs
- **LLM**: DashScope (Qwen), Gemini, HuggingFace
- **TTS**: ElevenLabs, Alibaba DashScope
- **ASR**: Browser Web Speech API

---

This architecture is designed for **rapid iteration**, **team collaboration**, and **horizontal scaling**. The Convex backend ensures all teams benefit from shared learnings while maintaining data consistency and real-time sync.
