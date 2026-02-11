# Team Deployment Checklist

## Quick Start Guide for Deploying to Testing Teams

This is the **TL;DR version** of the full DEPLOYMENT_GUIDE.md. Follow these steps in order.

---

## Prerequisites

- [ ] Convex account (free): https://dashboard.convex.dev/
- [ ] Vercel account (free): https://vercel.com/
- [ ] API Keys ready:
  - [ ] DashScope (Alibaba) - for Qwen LLM
  - [ ] Google Gemini - for fallback LLM
  - [ ] HuggingFace - for free LLM tier

---

## Step 1: Deploy Convex Backend (5 minutes)

```bash
cd voice-designer

# Deploy to production
npx convex deploy

# ✅ Copy the deployment URL shown (e.g., https://ideal-marlin-985.eu-west-1.convex.cloud)
```

**Seed initial knowledge base:**
```bash
npx convex run seed:runSeed
```

This populates brand vocabulary, product definitions, and validation rules.

---

## Step 2: Configure Vercel (10 minutes)

### 2.1 Link Project
```bash
npx vercel link
```

### 2.2 Set Environment Variables

```bash
# REQUIRED: Convex URL (from Step 1)
npx vercel env add VITE_CONVEX_URL production
# Enter: https://ideal-marlin-985.eu-west-1.convex.cloud

# REQUIRED: Enable Convex sync
npx vercel env add VITE_ENABLE_CONVEX_SYNC production
# Enter: true

# REQUIRED: Admin passphrase (choose a strong one)
npx vercel env add VITE_ADMIN_PASSPHRASE production
# Enter: your-strong-passphrase-here

# REQUIRED: API Keys (server-side, no VITE_ prefix)
npx vercel env add DASHSCOPE_API_KEY production
# Enter: your-dashscope-key

npx vercel env add GEMINI_API_KEY production
# Enter: your-gemini-key

npx vercel env add HUGGINGFACE_API_KEY production
# Enter: your-huggingface-key

# OPTIONAL: Additional LLM providers
npx vercel env add ELEVENLABS_API_KEY production
npx vercel env add OPENAI_API_KEY production
npx vercel env add CLAUDE_API_KEY production
```

### 2.3 Deploy
```bash
npx vercel --prod
```

**✅ Copy the deployment URL shown (e.g., https://voice-lab.vercel.app)**

---

## Step 3: Verify Deployment (2 minutes)

Visit your deployment URL and check:

- [ ] App loads without errors
- [ ] Onboarding modal appears on first visit
- [ ] Can create a user profile
- [ ] Can generate content
- [ ] Can give feedback (thumbs up/down)

**Test Admin Panel:**
- [ ] Visit `/admin` route
- [ ] Enter admin passphrase
- [ ] Dashboard shows data
- [ ] Can view feedback in "memory & learnings"

---

## Step 4: Share with Teams (5 minutes)

### 4.1 Prepare Team Communication

**Example Slack/Email Message:**

```
🚀 Voice Lab Beta Testing is Live!

We're excited to share the Voice Lab tool for testing. This tool helps you
generate brand-compliant content for Jio products with built-in validation.

📱 Access: https://voice-lab.vercel.app

🎯 First Steps:
1. Complete the onboarding (name, role, ecosystem)
2. Select your ecosystem (JioFiber, JioMart, AirFiber, etc.)
3. Choose a content channel (Social, Website, App, Email, etc.)
4. Start generating content!

💡 Key Features:
- AI-powered content generation
- Real-time brand compliance checking
- Trust scores for content quality
- Voice conversation mode (experimental)

📊 We Need Your Feedback:
- Use thumbs up/down to rate generated content
- Edit content and submit corrections
- Add comments on what works/doesn't work

👥 Admin Access (Team Leads Only):
- URL: https://voice-lab.vercel.app/admin
- Passphrase: [share separately]

❓ Questions? Contact: [your name/team]
```

### 4.2 Team Lead Onboarding

Share with team leads:
1. Admin URL: `https://your-deployment.vercel.app/admin`
2. Admin passphrase: `[the one you set]`
3. Responsibilities:
   - Monitor dashboard daily
   - Review and approve user corrections
   - Add new vocabulary/rules to knowledge base
   - Track team adoption and usage

---

## Step 5: Monitor & Iterate (Ongoing)

### Daily Tasks (5 minutes)
- [ ] Check admin dashboard for new feedback
- [ ] Review trust score trends
- [ ] Approve/reject corrections from "memory & learnings"

### Weekly Tasks (30 minutes)
- [ ] Analyze usage by team/ecosystem/channel
- [ ] Export top feedback items for review
- [ ] Update knowledge base with common issues
- [ ] Share insights with product team

### Monthly Tasks (2 hours)
- [ ] Review Convex/Vercel usage and costs
- [ ] Survey teams for tool improvements
- [ ] Plan next iteration based on feedback
- [ ] Rotate API keys (security best practice)

---

## Troubleshooting Common Issues

### Issue: Admin panel shows "loading..." forever

**Cause:** Convex not configured or sync disabled

**Fix:**
```bash
# Verify these are set in Vercel
vercel env ls production

# Should see:
# VITE_CONVEX_URL=https://...
# VITE_ENABLE_CONVEX_SYNC=true
```

### Issue: Users can't create profiles

**Cause:** Convex sync disabled or API errors

**Fix:**
1. Check browser console for errors
2. Verify `VITE_ENABLE_CONVEX_SYNC=true`
3. Check Convex dashboard for function errors

### Issue: Content generation fails

**Cause:** Missing or invalid API keys

**Fix:**
```bash
# Verify API keys are set (server-side, no VITE_ prefix)
vercel env ls production | grep API_KEY

# Test API keys individually in admin panel
```

### Issue: Knowledge base is empty

**Cause:** Seed script not run

**Fix:**
```bash
# Run seed script to populate initial data
npx convex run seed:runSeed
```

### Issue: Deployment fails

**Cause:** Build errors or missing dependencies

**Fix:**
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Test build locally: `npm run build`
4. Check Node.js version compatibility

---

## Security Reminders

- ✅ Admin passphrase: Share only with authorized leads
- ✅ API keys: Never commit to git, rotate every 90 days
- ✅ Convex access: Monitor dashboard for unexpected activity
- ✅ User data: Only stores device ID, role, ecosystem (no PII)

---

## Cost Estimation (50 testers)

| Service | Plan | Cost |
|---------|------|------|
| Convex | Hobby | $25/month |
| Vercel | Free | $0 |
| DashScope | Pay-as-you-go | ~$30/month |
| Gemini | Pay-as-you-go | ~$20/month |
| HuggingFace | Free tier | $0 |
| **Total** | | **~$75/month** |

*Costs vary based on actual usage. Free tiers may be sufficient for testing.*

---

## Success Metrics

Track these in the admin panel:

- **Adoption**: Number of users onboarded per team
- **Engagement**: Messages generated per user per week
- **Quality**: Average trust score across content
- **Feedback**: Thumbs up/down ratio, edit rate
- **Learnings**: Approved corrections added to knowledge base

---

## Next Steps After Testing

1. ✅ Collect qualitative feedback (surveys, interviews)
2. ✅ Analyze quantitative data from admin panel
3. ✅ Identify top improvement opportunities
4. ✅ Plan Phase 2 features based on feedback
5. ✅ Scale to production if successful

---

## Quick Links

- **App**: `https://your-deployment.vercel.app`
- **Admin**: `https://your-deployment.vercel.app/admin`
- **How It Works**: `https://your-deployment.vercel.app/how-it-works`
- **Convex Dashboard**: https://dashboard.convex.dev/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Full Deployment Guide**: See `DEPLOYMENT_GUIDE.md`

---

**Ready to launch!** 🚀

If you get stuck, refer to the full `DEPLOYMENT_GUIDE.md` or check the troubleshooting section above.
