# API Key Rotation Guide

## URGENT: Keys Requiring Rotation

The following API keys in `.env.local` were previously exposed and **MUST be rotated immediately**:

### 1. DashScope/Qwen API Key
- **Service**: Alibaba Cloud DashScope
- **Current Key Pattern**: `sk-afeb137058954b75af18c2bae5075852`
- **Dashboard**: https://dashscope.console.aliyun.com/
- **Steps**:
  1. Log in to DashScope console
  2. Navigate to API Keys section
  3. Delete the old key: `sk-afeb137058954b75af18c2bae5075852`
  4. Generate a new key
  5. Update `DASHSCOPE_API_KEY` in `.env.local`
  6. Update in Vercel environment variables (production)

### 2. Google Gemini API Key
- **Service**: Google AI Studio
- **Current Key Pattern**: `AIzaSyBkajC4Khcrb6JYC3horS8RjYM9Md-npKg`
- **Dashboard**: https://makersuite.google.com/app/apikey
- **Steps**:
  1. Log in to Google AI Studio
  2. Go to API Keys
  3. Delete key ending in `...npKg`
  4. Create new API key
  5. Update `GEMINI_API_KEY` in `.env.local`
  6. Update in Vercel environment variables (production)

### 3. HuggingFace API Key
- **Service**: HuggingFace
- **Current Key Pattern**: `hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXX` (redacted)
- **Dashboard**: https://huggingface.co/settings/tokens
- **Steps**:
  1. Log in to HuggingFace
  2. Go to Settings > Access Tokens
  3. Revoke the current token
  4. Create new token with same permissions
  5. Update `HUGGINGFACE_API_KEY` in `.env.local`
  6. Update in Vercel environment variables (production)

### 4. Inworld AI API Key
- **Service**: Inworld AI
- **Current Key Pattern**: `Tm5wSWg4YVJQV2U0ZUozM0FLajZvY3ducDRyTXJSc1Y...` (Base64 encoded)
- **Dashboard**: https://studio.inworld.ai/
- **Steps**:
  1. Log in to Inworld Studio
  2. Navigate to Integrations > API Keys
  3. Revoke the existing key
  4. Generate new API key
  5. Update `INWORLD_API_KEY` in `.env.local`
  6. Update in Vercel environment variables (production)

## Post-Rotation Checklist

After rotating all keys:

- [ ] Test all LLM providers locally (`npm run dev`)
- [ ] Verify Qwen/DashScope works
- [ ] Verify Gemini works
- [ ] Verify HuggingFace works
- [ ] Verify Inworld works
- [ ] Update Vercel production environment variables
- [ ] Deploy and test in production
- [ ] Remove this TODO from `.env.local` line 12
- [ ] Monitor for any service disruptions

## Prevention

To prevent future key exposure:

1. **Never commit** `.env.local` or `.env` files (already in `.gitignore`)
2. **Always use** Vercel Environment Variables for production
3. **Audit git history** for any past commits containing keys:
   ```bash
   git log -p -S "DASHSCOPE_API_KEY" -- .env .env.local
   ```
4. **Use** `.env.local.example` for documentation, never real keys
5. **Rotate keys** every 90 days as best practice

## Emergency: If Keys Are Actively Being Abused

If you notice unexpected API usage or charges:

1. **Immediately rotate** all keys at service providers
2. **Check API usage** dashboards for anomalies
3. **Review access logs** in Vercel
4. **Consider** enabling additional rate limiting
5. **Report** to service providers if malicious usage detected
