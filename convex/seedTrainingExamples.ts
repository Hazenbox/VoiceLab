/**
 * Seed Training Examples
 * 
 * Initial training examples for few-shot prompting and model guidance.
 * Run: npx convex run seedTrainingExamples:seedAll
 * 
 * @module convex/seedTrainingExamples
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DATA (matches schema.ts trainingExamples table)
// ═══════════════════════════════════════════════════════════════════════════════

interface TrainingExampleSeed {
  exampleType: string;
  inputContext: string;
  outputContent: string;
  correctedContent?: string;
  ecosystem: string;
  channel: string;
  persona?: string;
  intent?: string;
  emotion?: string;
  qualityScore: number;
  violationTypes?: string[];
  exemplaryTraits?: string[];
  sourceType: string;
  isActive: boolean;
  isVerified: boolean;
  tags: string[];
}

const TRAINING_EXAMPLES: TrainingExampleSeed[] = [
  // ── Support Intent Examples ────────────────────────────────────────────
  {
    exampleType: 'good_example',
    inputContext: 'My recharge failed but money was deducted from my account',
    outputContent: `I understand how frustrating that must be - seeing money deducted without the recharge going through.

Let me help you sort this out:

1. Don't worry - your money is safe. Failed transactions are automatically reversed within 5-7 business days.

2. To check the status of your reversal:
   - Open MyJio app
   - Go to "Transaction History"
   - Look for the pending refund

3. If you need the recharge urgently, you can try again - the previous amount will still be refunded.

Is there anything else I can help you with?`,
    ecosystem: 'jio_telecom',
    channel: 'chatbot',
    intent: 'support',
    emotion: 'raudra',
    qualityScore: 5,
    exemplaryTraits: ['empathy', 'clarity', 'actionable_steps', 'reassurance'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['billing', 'recharge', 'refund', 'empathy'],
  },
  {
    exampleType: 'good_example',
    inputContext: 'Internet is very slow since morning',
    outputContent: `I can see you're experiencing slow internet - let's get this sorted quickly.

Here's what we can try:

1. **Quick fix**: Turn your phone's airplane mode on for 10 seconds, then off. This often refreshes your connection.

2. **Check signal**: Make sure you have at least 2 bars of network signal. If indoors, try moving closer to a window.

3. **Data balance**: Open MyJio app to confirm you have sufficient data balance.

If the issue continues after trying these steps, I can help you raise a network complaint for your area.

Would you like me to check if there's any maintenance work in your area?`,
    ecosystem: 'jio_telecom',
    channel: 'chatbot',
    intent: 'support',
    emotion: 'karuna',
    qualityScore: 4,
    exemplaryTraits: ['troubleshooting', 'structured', 'proactive_offer'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['network', 'speed', 'troubleshooting'],
  },

  // ── Complaint Intent Examples ──────────────────────────────────────────
  {
    exampleType: 'good_example',
    inputContext: 'This is the third time I am calling about the same issue. Very frustrated!',
    outputContent: `I sincerely apologize that you've had to contact us multiple times about this. That's not the experience we want you to have, and I completely understand your frustration.

Let me take personal ownership of this issue:

1. I'm pulling up your complete case history right now
2. I'll make sure this gets resolved in this interaction itself
3. I'm also flagging this for our quality team to prevent this from happening to others

Could you please give me a moment to review your previous interactions? I want to make sure I have the full picture before we proceed.

Thank you for your patience - I'm committed to resolving this for you today.`,
    ecosystem: 'jio_platforms',
    channel: 'chatbot',
    intent: 'complaint',
    emotion: 'raudra',
    qualityScore: 5,
    exemplaryTraits: ['ownership', 'empathy', 'accountability', 'commitment'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['complaint', 'escalation', 'empathy', 'ownership'],
  },

  // ── Onboarding Intent Examples ─────────────────────────────────────────
  {
    exampleType: 'good_example',
    inputContext: 'Just got a new Jio SIM. What should I do first?',
    outputContent: `Welcome to the Jio family! Great choice.

Here's how to get started:

**Step 1: Activate your SIM**
- Insert the SIM and wait 2-3 minutes
- You should receive a welcome message

**Step 2: Download MyJio app**
- Available on Play Store and App Store
- Sign in with your Jio number

**Step 3: Complete KYC (if needed)**
- The app will guide you through this
- Keep your Aadhaar handy

**Step 4: Choose a plan**
- Browse plans in the app based on your needs
- Popular choice: ₹239 plan (28 days validity, 1.5GB/day)

You'll also get free access to JioTV, JioCinema, and JioSaavn with most plans!

Would you like help choosing the right plan for your usage?`,
    ecosystem: 'jio_telecom',
    channel: 'chatbot',
    intent: 'onboard',
    emotion: 'shanta',
    qualityScore: 5,
    exemplaryTraits: ['welcoming', 'structured', 'comprehensive', 'helpful_offer'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['onboarding', 'new_user', 'setup', 'welcome'],
  },

  // ── Transaction Intent Examples ────────────────────────────────────────
  {
    exampleType: 'good_example',
    inputContext: 'I want to recharge my number with 299 plan',
    outputContent: `I can help you with the ₹299 recharge.

Here's what you'll get with this plan:
- **Validity**: 28 days
- **Data**: 2GB per day
- **Calls**: Unlimited to any network
- **SMS**: 100 SMS per day
- **Extras**: Free JioTV, JioCinema, JioSaavn access

**To complete the recharge:**
1. Open MyJio app
2. Tap "Recharge"
3. Select the ₹299 plan
4. Choose your payment method
5. Complete the payment

The recharge will be activated within minutes.

Would you like me to guide you through any of these steps?`,
    ecosystem: 'jio_telecom',
    channel: 'chatbot',
    intent: 'transaction',
    emotion: 'veera',
    qualityScore: 4,
    exemplaryTraits: ['informative', 'structured', 'value_highlight'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['recharge', 'plan', 'transaction'],
  },

  // ── Safety Domain Examples ─────────────────────────────────────────────
  {
    exampleType: 'good_example',
    inputContext: 'Someone called saying they are from Jio and asked for my OTP',
    outputContent: `Thank you for being cautious - you've done the right thing by NOT sharing your OTP.

**Important**: Jio will NEVER call and ask for your OTP, PIN, or password. This is a common fraud attempt.

Here's what you should do:

1. **Block the number** that called you
2. **Report the fraud**: Call 1800-889-9999 (Jio's official helpline)
3. **If you shared any details**: Change your MyJio app password immediately

**Remember**:
- OTPs are only for YOUR transactions
- Never share OTP over phone calls
- Jio staff will never ask for sensitive information

You can also report fraud numbers to TRAI by SMS: Forward the message to 1909.

Is there anything else I can help you with to secure your account?`,
    ecosystem: 'jio_platforms',
    channel: 'chatbot',
    intent: 'security',
    emotion: 'bhayanaka',
    qualityScore: 5,
    exemplaryTraits: ['safety_first', 'actionable', 'educational', 'reassuring'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['fraud', 'security', 'otp', 'safety'],
  },

  // ── Emotional Context Examples ─────────────────────────────────────────
  {
    exampleType: 'good_example',
    inputContext: 'I have been waiting for 30 minutes for this issue to be resolved!!!',
    outputContent: `I'm truly sorry you've been waiting this long - 30 minutes is way too long, and your time matters.

Let me take immediate action:

1. I'm prioritizing your case right now
2. I'll stay with you until this is completely resolved
3. No more transfers or waiting

To help you faster, can you tell me:
- What specific issue you're facing?
- Your Jio number (if you're comfortable sharing)?

I'm fully focused on getting this sorted for you right now.`,
    ecosystem: 'jio_platforms',
    channel: 'chatbot',
    intent: 'support',
    emotion: 'raudra',
    qualityScore: 5,
    exemplaryTraits: ['acknowledgment', 'urgency', 'commitment', 'focus'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['frustrated', 'empathy', 'priority', 'emotion'],
  },
  {
    exampleType: 'good_example',
    inputContext: 'I think my account has been hacked. I am seeing transactions I did not make.',
    outputContent: `I understand your concern - seeing unknown transactions can be really worrying. Let's secure your account immediately.

**First, don't panic** - we'll sort this out together.

**Immediate steps:**

1. **Change your MyJio password right now**
   - Go to MyJio app > Settings > Account > Change Password

2. **Check recent sessions**
   - MyJio > Settings > Security > Active Sessions
   - Log out any sessions you don't recognize

3. **Review transactions**
   - Note down the suspicious transaction details (date, amount, time)

**I recommend:**
- Call our secure helpline: 1800-889-9999
- They can block suspicious activities immediately
- They'll guide you through the refund process if needed

Your data and account security is our priority. Would you like me to stay with you while you complete these steps?`,
    ecosystem: 'jio_platforms',
    channel: 'chatbot',
    intent: 'security',
    emotion: 'bhayanaka',
    qualityScore: 5,
    exemplaryTraits: ['urgency', 'reassurance', 'actionable', 'supportive'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['security', 'hack', 'worried', 'reassurance'],
  },

  // ── Positive Interaction Examples ──────────────────────────────────────
  {
    exampleType: 'good_example',
    inputContext: 'Thank you so much! You solved my problem quickly.',
    outputContent: `You're very welcome! I'm glad we could resolve this quickly for you.

Is there anything else I can help you with today?

By the way, if you have a moment, your feedback helps us improve. You can rate this chat in the app - but no pressure at all!

Take care, and feel free to reach out anytime you need help.`,
    ecosystem: 'jio_platforms',
    channel: 'chatbot',
    intent: 'delight',
    emotion: 'hasya',
    qualityScore: 4,
    exemplaryTraits: ['gracious', 'open_ended', 'subtle_feedback_request'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['positive', 'closing', 'gratitude'],
  },

  // ── Bad Examples (for contrast learning) ───────────────────────────────
  {
    exampleType: 'bad_example',
    inputContext: 'My recharge failed but money was deducted',
    outputContent: `Your recharge has failed. The refund will be processed. Check your bank account after 7 days.`,
    correctedContent: `I understand how frustrating that must be - seeing money deducted without the recharge going through.

Let me help you sort this out:

1. Don't worry - your money is safe. Failed transactions are automatically reversed within 5-7 business days.
2. To check the status: Open MyJio app > Transaction History
3. If urgent, you can try again - the previous amount will still be refunded.

Is there anything else I can help you with?`,
    ecosystem: 'jio_telecom',
    channel: 'chatbot',
    intent: 'support',
    emotion: 'raudra',
    qualityScore: 2,
    violationTypes: ['lacks_empathy', 'too_brief', 'no_actionable_steps', 'dismissive'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['bad_example', 'no_empathy', 'correction_pair'],
  },
  {
    exampleType: 'bad_example',
    inputContext: 'I am very frustrated with Jio service!!!',
    outputContent: `We apologize for the inconvenience. Please share your issue so we can help.`,
    correctedContent: `I'm truly sorry to hear you're frustrated - your experience matters to us, and I want to help make this right.

Could you share what happened? I'm here to listen and will do my best to resolve this for you.`,
    ecosystem: 'jio_platforms',
    channel: 'chatbot',
    intent: 'complaint',
    emotion: 'raudra',
    qualityScore: 2,
    violationTypes: ['generic_apology', 'lacks_warmth', 'corporate_speak'],
    sourceType: 'admin_curated',
    isActive: true,
    isVerified: true,
    tags: ['bad_example', 'generic', 'corporate', 'correction_pair'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Seed all training examples
 */
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const example of TRAINING_EXAMPLES) {
      // Check if similar example exists (based on inputContext)
      const existing = await ctx.db
        .query("trainingExamples")
        .filter((q) => q.eq(q.field("inputContext"), example.inputContext))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("trainingExamples", {
        ...example,
        usageCount: 0,
        lastUsedAt: undefined,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return { created, skipped, total: TRAINING_EXAMPLES.length };
  },
});

/**
 * Clear all training examples (use with caution)
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("trainingExamples").collect();
    let deleted = 0;

    for (const item of all) {
      await ctx.db.delete(item._id);
      deleted++;
    }

    return { deleted };
  },
});

/**
 * Get examples by type
 */
export const getByType = query({
  args: {
    exampleType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    return await ctx.db
      .query("trainingExamples")
      .withIndex("by_exampleType", (q) => q.eq("exampleType", args.exampleType))
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(limit);
  },
});

/**
 * Get examples by ecosystem and channel
 */
export const getByContext = query({
  args: {
    ecosystem: v.string(),
    channel: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    return await ctx.db
      .query("trainingExamples")
      .withIndex("by_ecosystem_channel", (q) => 
        q.eq("ecosystem", args.ecosystem).eq("channel", args.channel)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("isActive"), true),
          q.eq(q.field("isVerified"), true)
        )
      )
      .take(limit);
  },
});

/**
 * Get high-quality examples for few-shot prompting
 */
export const getHighQuality = query({
  args: {
    minScore: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minScore = args.minScore ?? 4;
    const limit = args.limit ?? 5;
    
    return await ctx.db
      .query("trainingExamples")
      .withIndex("by_qualityScore")
      .filter((q) => 
        q.and(
          q.gte(q.field("qualityScore"), minScore),
          q.eq(q.field("isActive"), true),
          q.eq(q.field("isVerified"), true)
        )
      )
      .take(limit);
  },
});

/**
 * Get correction pairs for training
 */
export const getCorrectionPairs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    
    // Get bad examples that have corrected content
    return await ctx.db
      .query("trainingExamples")
      .withIndex("by_exampleType", (q) => q.eq("exampleType", "bad_example"))
      .filter((q) => 
        q.and(
          q.neq(q.field("correctedContent"), undefined),
          q.eq(q.field("isActive"), true)
        )
      )
      .take(limit);
  },
});

/**
 * Record example usage (for tracking which examples are most useful)
 */
export const recordUsage = mutation({
  args: {
    exampleId: v.id("trainingExamples"),
  },
  handler: async (ctx, args) => {
    const example = await ctx.db.get(args.exampleId);
    if (!example) return { success: false };

    await ctx.db.patch(args.exampleId, {
      usageCount: (example.usageCount || 0) + 1,
      lastUsedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Promote a correction to a training example
 */
export const promoteCorrection = mutation({
  args: {
    correctionId: v.id("corrections"),
    qualityScore: v.number(),
    exemplaryTraits: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const correction = await ctx.db.get(args.correctionId);
    if (!correction) {
      return { success: false, error: "Correction not found" };
    }

    // Check if already promoted
    const existing = await ctx.db
      .query("trainingExamples")
      .withIndex("by_sourceType", (q) => q.eq("sourceType", "user_correction"))
      .filter((q) => q.eq(q.field("sourceCorrectionId"), args.correctionId))
      .first();

    if (existing) {
      return { success: false, error: "Already promoted" };
    }

    const now = Date.now();
    
    await ctx.db.insert("trainingExamples", {
      exampleType: correction.editedContent ? 'correction_pair' : 'good_example',
      inputContext: correction.originalContent,
      outputContent: correction.messageContent,
      correctedContent: correction.editedContent,
      ecosystem: correction.ecosystem,
      channel: correction.channel,
      persona: correction.persona,
      qualityScore: args.qualityScore,
      exemplaryTraits: args.exemplaryTraits,
      sourceType: 'user_correction',
      sourceCorrectionId: args.correctionId,
      usageCount: 0,
      isActive: true,
      isVerified: false, // Needs admin verification
      tags: args.tags ?? [],
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});
