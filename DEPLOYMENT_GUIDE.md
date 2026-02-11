# Voice Lab - Team Deployment Guide

## Why Convex Should Be Required for Team Deployment

### Current State: Convex is Optional
Convex is currently **feature-flagged** and **optional** because:
- The app was designed to work in "local-only mode" during initial development
- Feature flags allow phased rollout (Phase 0-5)
- Graceful degradation when Convex is unavailable

### Why This Won't Work for Team Testing

When you deploy to teams for testing, **Convex must be required** because:

#### 1. **Admin Panel Requires Convex** (Critical)
The `/admin` route is **completely non-functional** without Convex:
- **Dashboard**: Shows analytics, feedback counts, saved examples
- **Analytics**: Charts by ecosystem, channel, persona, trust scores
- **Memory & Learnings**: All user feedback (thumbs up/down, edits, comments)
- **Knowledge Base**: Avoid words, preferred terms, auto-fix rules
- **Users**: Team member profiles and activity tracking

**Without Convex, admins see loading screens forever or empty states.**

#### 2. **Cross-Team Data Sharing**
- **Problem**: Without Convex, each tester's data stays in their browser's `localStorage`
- **Impact**: No visibility into how different teams use the tool
- **Need**: Central database to aggregate feedback across all testers

#### 3. **Learning & Improvement**
- **Feedback Loop**: User corrections and edits are sent to Convex
- **Admin Review**: Admins approve/reject feedback in `/admin/memory`
- **Knowledge Injection**: Approved learnings are injected into prompts for all users
- **Without Convex**: Each user learns in isolation, no shared intelligence

#### 4. **Analytics & Insights**
Teams need to see:
- Which ecosystems are most used (JioFiber, JioMart, AirFiber, etc.)
- Which channels generate the most content (Social, Website, App, Email)
- Trust scores across different content types
- Validation violations and common errors

#### 5. **Knowledge Base Management**
Admins need to centrally manage:
- Brand vocabulary (avoid words, preferred terms)
- Product definitions (JioFiber vs Jio Fiber)
- Auto-fix rules
- Approved examples
- Channel-specific overrides

---

## Deployment Architecture for Team Testing

### Recommended Setup

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Deployment                     │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Frontend   │  │  API Routes  │  │    Admin     │  │
│  │   (React)    │  │  (Serverless)│  │    Panel     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                │                 │           │
│           └────────────────┴─────────────────┘           │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
                             ▼
                   ┌─────────────────┐
                   │  Convex Cloud   │
                   │  (Database +    │
                   │   Vector Store) │
                   └─────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
     ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
     │  Team A │       │  Team B │       │  Team C │
     │ Marketing│      │ Product │       │   UX    │
     └─────────┘       └─────────┘       └─────────┘
```

### Key Components

1. **Single Convex Deployment** (Production)
   - Shared database for all teams
   - Real-time sync across all users
   - Vector embeddings for semantic search

2. **Vercel Deployment** (Main App)
   - Frontend: React + Vite
   - API Routes: LLM proxies, TTS, ASR
   - Environment variables for secrets

3. **Admin Access**
   - Secure passphrase: `VITE_ADMIN_PASSPHRASE`
   - Centralized dashboard for all feedback
   - Knowledge base management

---

## Step-by-Step Deployment Plan

### Phase 1: Prepare Convex (Required)

#### 1.1 Create Production Deployment
```bash
cd voice-designer
npx convex deploy
```

This creates a **production Convex deployment** (already done: `ideal-marlin-985`)

#### 1.2 Get Deployment URL
```bash
# Production URL (already available)
https://ideal-marlin-985.eu-west-1.convex.cloud
```

#### 1.3 Seed Initial Knowledge Base (Recommended)
```bash
# Run the seed script to populate initial data
npx convex run seed:runSeed
```

This populates:
- Tier 1 avoid words (Jio brand vocabulary)
- Product definitions
- Channel/ecosystem overrides
- Auto-fix rules

---

### Phase 2: Configure Environment Variables

#### 2.1 Update `.env.production`
```bash
# ============================================
# CONVEX BACKEND (REQUIRED FOR TEAM TESTING)
# ============================================
VITE_CONVEX_URL=https://ideal-marlin-985.eu-west-1.convex.cloud

# ============================================
# FEATURE FLAGS (Enable All for Team Testing)
# ============================================
VITE_ENABLE_CONVEX_SYNC=true      # ✅ MUST BE TRUE
VITE_ENABLE_PERSONA=true          # Role-based auto-config
VITE_ENABLE_KNOWLEDGE_BASE=true   # Dynamic vocabulary rules
VITE_ENABLE_LEARNING=true         # Learn from user feedback
VITE_ENABLE_RAG=false             # Optional: semantic search (needs embeddings)
VITE_ENABLE_CONVERSATIONAL_MODE=true

# ============================================
# ADMIN PANEL (Set Strong Passphrase)
# ============================================
VITE_ADMIN_PASSPHRASE=<STRONG_SECURE_PASSPHRASE>

# ============================================
# API KEYS (Server-Side Only)
# ============================================
DASHSCOPE_API_KEY=<your_key>
GEMINI_API_KEY=<your_key>
HUGGINGFACE_API_KEY=<your_key>
# ... other API keys
```

#### 2.2 Vercel Environment Variables
Set these in Vercel Dashboard → Settings → Environment Variables:

**Required for All Environments:**
- `VITE_CONVEX_URL` → Production Convex URL
- `VITE_ENABLE_CONVEX_SYNC` → `true`
- `VITE_ADMIN_PASSPHRASE` → Strong passphrase
- `DASHSCOPE_API_KEY` → Your DashScope key
- `GEMINI_API_KEY` → Your Gemini key
- `HUGGINGFACE_API_KEY` → Your HuggingFace key

**Optional (for additional features):**
- `ELEVENLABS_API_KEY` → ElevenLabs TTS
- `OPENAI_API_KEY` → OpenAI GPT models
- `CLAUDE_API_KEY` → Anthropic Claude

---

### Phase 3: Make Convex Required (Code Changes)

#### 3.1 Update Feature Flags Default
```typescript
// src/services/featureFlags.ts
export const featureFlags = {
  get convexSync(): boolean {
    // Change default from false to true for production
    const value = import.meta.env.VITE_ENABLE_CONVEX_SYNC;
    return value === undefined ? true : value === 'true'; // Default to true
  },
  // ... rest
}
```

#### 3.2 Add Convex Requirement Check
```typescript
// src/main.tsx
const convexUrl = import.meta.env.VITE_CONVEX_URL;

// Show error if Convex is not configured in production
if (import.meta.env.PROD && !convexUrl) {
  createRoot(document.getElementById('root')!).render(
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#1a1a2e',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: '20px',
    }}>
      <div>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Configuration Error</h1>
        <p>Convex backend is not configured. Please contact your administrator.</p>
      </div>
    </div>
  );
  throw new Error('VITE_CONVEX_URL is required in production');
}

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
```

#### 3.3 Update Admin Panel
```typescript
// src/admin/AdminLayout.tsx
// Add check at the top of the component
function AdminDashboard() {
  const corrections = useQuery(api.corrections.listAll, { limit: 100 });
  const knowledgeCounts = useQuery(api.knowledge.countByType);
  
  // Show error if Convex is not available
  if (corrections === undefined || knowledgeCounts === undefined) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Loading admin dashboard...</p>
        <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}>
          If this persists, Convex backend may not be configured.
        </p>
      </div>
    );
  }
  
  // ... rest of component
}
```

---

### Phase 4: Deploy to Vercel

#### 4.1 Link Vercel Project (if not already linked)
```bash
cd voice-designer
npx vercel link
```

#### 4.2 Set Environment Variables in Vercel
```bash
# Set production Convex URL
npx vercel env add VITE_CONVEX_URL production
# Paste: https://ideal-marlin-985.eu-west-1.convex.cloud

# Enable Convex sync
npx vercel env add VITE_ENABLE_CONVEX_SYNC production
# Enter: true

# Set admin passphrase
npx vercel env add VITE_ADMIN_PASSPHRASE production
# Enter: your-strong-passphrase

# Set API keys (server-side, no VITE_ prefix)
npx vercel env add DASHSCOPE_API_KEY production
npx vercel env add GEMINI_API_KEY production
npx vercel env add HUGGINGFACE_API_KEY production
```

#### 4.3 Deploy
```bash
# Deploy to production
npx vercel --prod

# Or use Vercel CLI
vercel deploy --prod
```

---

### Phase 5: Team Onboarding

#### 5.1 Share Deployment URL
Example: `https://voice-lab.vercel.app`

#### 5.2 User Onboarding Flow
When users first visit, they see an **onboarding modal**:
1. Enter name
2. Select role (Marketing, Product, UX Writer, Sales, Support, Leadership)
3. Select primary ecosystem (JioFiber, JioMart, AirFiber, etc.)

This creates a **user profile in Convex** linked to their device.

#### 5.3 Admin Access
Share admin URL with team leads:
- URL: `https://voice-lab.vercel.app/admin`
- Passphrase: (the one you set in `VITE_ADMIN_PASSPHRASE`)

#### 5.4 Admin Responsibilities
Admins should:
1. **Monitor Dashboard**: Check daily feedback, trust scores, violations
2. **Review Memory**: Approve/reject user corrections and edits
3. **Manage Knowledge**: Add avoid words, product definitions, channel overrides
4. **Track Users**: See which teams are actively testing
5. **Analyze Trends**: Identify common issues, popular ecosystems/channels

---

## Testing Checklist for Teams

### Before Sharing with Teams

- [ ] Convex production deployment is live and seeded
- [ ] `VITE_CONVEX_URL` is set in Vercel
- [ ] `VITE_ENABLE_CONVEX_SYNC=true` in production
- [ ] Admin passphrase is set and secure
- [ ] API keys are configured (DashScope, Gemini, HuggingFace)
- [ ] Deployed to Vercel and accessible
- [ ] Admin panel loads (test at `/admin`)
- [ ] User onboarding modal appears on first visit
- [ ] Test creating content and giving feedback
- [ ] Verify feedback appears in admin panel

### For Each Testing Team

- [ ] Share deployment URL
- [ ] Provide onboarding instructions
- [ ] Explain feedback mechanisms (thumbs up/down, edit, comment)
- [ ] Show how to switch ecosystems/channels
- [ ] Demonstrate trust score and validation results
- [ ] Share admin panel access with team lead

### After Testing Begins

- [ ] Monitor Convex dashboard for activity
- [ ] Review feedback in admin panel daily
- [ ] Approve valuable corrections
- [ ] Add common vocabulary to knowledge base
- [ ] Track trust scores across teams
- [ ] Collect team feedback on the tool itself

---

## Architecture Decisions

### Why Single Convex Deployment?

**Pros:**
- ✅ All teams share knowledge and learnings
- ✅ Single admin panel for all feedback
- ✅ Cross-team analytics and insights
- ✅ Consistent vocabulary and rules
- ✅ Lower cost (one deployment)

**Cons:**
- ⚠️ No data isolation between teams
- ⚠️ One team's feedback affects others

**Recommendation:** Use **single deployment** for testing phase. If teams need isolation later, use **Convex team workspaces** or **separate deployments per team**.

### Why Feature Flags?

Feature flags allow:
- **Gradual rollout**: Enable features one at a time
- **A/B testing**: Compare user experience with/without features
- **Risk mitigation**: Disable problematic features quickly
- **Development flexibility**: Test locally without all features

For team testing, **enable all flags** to get full experience.

---

## Cost Estimation

### Convex
- **Free tier**: 1M function calls/month, 1GB storage
- **Hobby**: $25/month - 10M calls, 8GB storage
- **Pro**: $65/month - 100M calls, 32GB storage

**Estimate for 50 testers:**
- ~1000 messages/user/month = 50,000 messages
- ~5 Convex calls/message = 250,000 function calls/month
- **Recommended:** Hobby tier ($25/month)

### Vercel
- **Free tier**: 100GB bandwidth, unlimited requests
- **Pro**: $20/month - 1TB bandwidth, advanced features

**Estimate for 50 testers:**
- Likely fits in **free tier** for testing phase

### LLM APIs (Variable)
- **DashScope (Qwen)**: ~$0.001/request (primary)
- **Gemini**: ~$0.002/request (fallback)
- **HuggingFace**: FREE tier available

**Estimated monthly cost:** $50-100 for 50 active testers

---

## Monitoring & Maintenance

### Daily Tasks
- Check admin dashboard for new feedback
- Review trust score trends
- Approve/reject corrections

### Weekly Tasks
- Analyze usage by team/ecosystem/channel
- Update knowledge base with common issues
- Export feedback for deeper analysis

### Monthly Tasks
- Review Convex usage and costs
- Audit API key usage and rotate if needed
- Survey teams for tool improvements

---

## Security Considerations

### API Keys
- ✅ Store server-side only (no `VITE_` prefix)
- ✅ Rotate every 90 days
- ✅ Use separate keys for dev/staging/prod
- ⚠️ Never commit to git

### Admin Access
- ✅ Strong passphrase (16+ characters)
- ✅ Share only with authorized team leads
- ✅ Consider IP restrictions in Vercel
- ⚠️ Audit admin actions in Convex logs

### User Data
- ✅ Convex stores: profiles, feedback, corrections
- ✅ No personal data (only device ID, role, ecosystem)
- ✅ GDPR-compliant (anonymized)
- ⚠️ Add data retention policy if needed

---

## Troubleshooting

### Admin Panel Shows Loading Forever
- **Cause:** Convex not configured or `VITE_ENABLE_CONVEX_SYNC=false`
- **Fix:** Set `VITE_CONVEX_URL` and `VITE_ENABLE_CONVEX_SYNC=true`

### Feedback Not Appearing in Admin
- **Cause:** Convex sync is disabled
- **Fix:** Enable `VITE_ENABLE_CONVEX_SYNC=true` in production

### Knowledge Base Empty
- **Cause:** Seed script not run
- **Fix:** Run `npx convex run seed:runSeed`

### Users Can't Access App
- **Cause:** Build failed or environment variables missing
- **Fix:** Check Vercel deployment logs, verify all required env vars

---

## Next Steps After Testing

1. **Collect Feedback**: Survey teams on tool usability
2. **Analyze Data**: Export Convex data for deeper insights
3. **Iterate**: Improve validation rules, vocabulary, UI based on feedback
4. **Scale**: If successful, plan for production rollout to all teams
5. **Docs**: Create user guides, best practices, and training materials

---

## Support & Resources

- **Convex Dashboard**: https://dashboard.convex.dev/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Admin Panel**: `<your-deployment-url>/admin`
- **How It Works**: `<your-deployment-url>/how-it-works`

---

**Ready to deploy!** Follow phases 1-5 above, and your team testing environment will be live. 🚀
