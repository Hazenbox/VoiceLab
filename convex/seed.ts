/**
 * Seed Convex Knowledge Base with Tier 1 data
 * 
 * Step 1 - Seed data:
 *   npx convex run seed:seedAll
 * 
 * Step 2 - Generate embeddings for vector search (Phase 4):
 *   npx convex run embeddings:backfillEmbeddings
 *   (requires HUGGINGFACE_API_KEY env var set in Convex dashboard)
 *   Uses sentence-transformers/all-MiniLM-L6-v2 (384 dims, free tier)
 *   Run multiple times if needed -- it processes 50 items per call.
 * 
 * Seeds:
 * - Avoid words (7 categories, ~283 words)
 * - Preferred vocabulary (6 categories, ~311 words)
 * - Gender-neutral & simple alternatives (~43 pairs)
 * - Products/ecosystems (14 definitions)
 * - Festivals (11 definitions)
 * - Auto-fix rules (17 replacements)
 */

import { mutation, query } from "./_generated/server";

// ── Helper: Build knowledge item ─────────────────────────────────

interface SeedItem {
  type: string;
  category: string;
  content: string;
  metadata: {
    ecosystem?: string;
    channel?: string;
    persona?: string;
    severity?: string;
    suggestion?: string;
    source?: string;
  };
  tags: string[];
  isActive: boolean;
  createdBy: string;
}

// ── Seed All ─────────────────────────────────────────────────────

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("knowledgeItems")
      .withIndex("by_type", (q) => q.eq("type", "avoid_word"))
      .first();

    if (existing) {
      console.log("Knowledge base already seeded. Skipping.");
      return { status: "already_seeded", count: 0 };
    }

    const now = Date.now();
    let count = 0;

    const insert = async (item: SeedItem) => {
      await ctx.db.insert("knowledgeItems", {
        ...item,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    };

    // ── 1. Avoid Words ───────────────────────────────────────────

    const avoidCategories: { category: string; severity: string; words: string[] }[] = [
      {
        category: "complex",
        severity: "warning",
        words: [
          "utilize", "leverage", "synergy", "paradigm", "bandwidth",
          "deep dive", "circle back", "touch base", "take offline",
          "move the needle", "low-hanging fruit", "boil the ocean",
          "aforementioned", "henceforth", "hereby", "therein", "whereby",
          "pursuant to", "in accordance with", "notwithstanding",
          "in lieu of", "with respect to", "pertaining to",
          "in order to", "for the purpose of", "at this point in time",
          "due to the fact that", "in the event that", "with regard to",
          "as a matter of fact", "it should be noted that",
          "kindly", "furthermore", "moreover", "nevertheless",
          "hitherto", "whereas", "inasmuch", "insofar", "heretofore",
        ],
      },
      {
        category: "robotic",
        severity: "warning",
        words: [
          "auto-generated", "system generated", "do not reply",
          "this is an automated", "no-reply", "unsubscribe",
          "as per our records", "for your reference", "please note",
          "be advised", "be informed", "please be notified",
          "it has come to our attention", "we wish to inform",
          "your request has been", "your query has been",
          "reference number", "ticket number", "case number",
          "please wait", "please hold", "your call is important",
          "regards", "best regards", "yours faithfully", "yours sincerely",
          "thanking you", "hoping for your cooperation",
        ],
      },
      {
        category: "fear_based",
        severity: "error",
        words: [
          "urgent", "hurry", "rush", "immediate", "now or never",
          "last chance", "final warning", "act now", "limited time",
          "running out", "expires soon", "only X left",
          "don't miss", "don't miss out", "FOMO", "everyone is",
          "others are already", "you'll regret", "never again",
          "consequences", "penalty", "forfeit", "lose", "lose out",
          "terminated", "suspended", "blocked", "denied", "rejected",
          "problem", "issue", "error", "failure", "mistake",
          "wrong", "bad", "poor", "terrible", "awful",
        ],
      },
      {
        category: "bureaucratic",
        severity: "warning",
        words: [
          "terms and conditions apply", "subject to", "binding",
          "liability", "indemnify", "warrant", "covenant",
          "force majeure", "in perpetuity", "non-transferable",
          "procedure", "protocol", "compliance", "mandate",
          "regulation", "stipulation", "provision", "clause",
          "herewith", "thereto", "therewith", "thereof",
          "abovementioned", "undersigned",
          "the management", "the company", "the organization",
          "corporate policy", "internal policy", "standard procedure",
        ],
      },
      {
        category: "technical",
        severity: "info",
        words: [
          "backend", "frontend", "API", "SDK", "cache",
          "latency", "throughput", "protocol",
          "encryption", "algorithm", "parameter", "configuration",
          "deploy", "integrate", "implement", "initialize",
          "authenticate", "authorize", "validate", "parse",
          "server", "database", "query", "token", "session",
          "endpoint", "payload", "response", "request",
        ],
      },
      {
        category: "shame_inducing",
        severity: "error",
        words: [
          "you forgot", "you missed", "you failed", "your fault",
          "your mistake", "your error", "you should have",
          "why didn't you", "you need to", "you must",
          "obviously", "clearly", "simply", "just", "easily",
          "anyone can", "it's easy", "as you know",
          "as I mentioned", "as I said", "again", "once more",
          "let me explain again", "to clarify", "to be clear",
          "others have already", "most users", "unlike you",
          "your peers", "competitors", "falling behind",
          "overdue", "delinquent", "defaulter", "outstanding balance",
          "failure to pay", "non-payment", "debt", "owed",
        ],
      },
      {
        category: "elitist",
        severity: "warning",
        words: [
          "tech-savvy", "power user", "early adopter", "digital native",
          "influencer", "thought leader", "disruptor", "innovator",
          "premium", "exclusive", "elite", "VIP", "luxury",
          "high-end", "upscale", "sophisticated", "discerning",
          "invite-only", "members only", "select few", "chosen",
          "privileged", "special access", "limited membership",
          "affluent", "high net worth", "wealthy", "rich",
          "premium living", "luxury lifestyle", "aspirational",
        ],
      },
    ];

    for (const cat of avoidCategories) {
      for (const word of cat.words) {
        await insert({
          type: "avoid_word",
          category: cat.category,
          content: word,
          metadata: {
            severity: cat.severity,
            source: "system_v1",
          },
          tags: ["avoid", cat.category, "tier1"],
          isActive: true,
          createdBy: "system",
        });
      }
    }

    // ── 2. Preferred Vocabulary ──────────────────────────────────

    const vocabCategories: { category: string; words: string[] }[] = [
      {
        category: "care_connection",
        words: [
          "welcome", "glad", "happy", "pleased", "wonderful", "lovely", "great",
          "beautiful", "delightful", "joy", "warm", "heartfelt", "genuine",
          "understand", "hear", "feel", "care", "matter", "important",
          "appreciate", "value", "respect", "acknowledge", "recognize",
          "together", "with you", "by your side", "here for you", "alongside",
          "partner", "support", "help", "assist", "guide", "walk you through",
          "thank you", "grateful", "thankful", "means a lot",
          "valued", "cherished", "treasured",
          "safe", "secure", "protected", "assured", "confident", "reliable",
          "trusted", "dependable", "steady", "stable",
          "namaste", "dhanyavaad", "shukriya", "swagat", "aapka",
        ],
      },
      {
        category: "action_progress",
        words: [
          "start", "begin", "launch", "kick off", "get going", "take off",
          "embark", "set out", "dive in", "jump in",
          "move", "progress", "advance", "grow", "build", "expand",
          "develop", "evolve", "improve", "enhance",
          "achieve", "accomplish", "complete", "finish", "done", "success",
          "win", "earn", "gain", "reach", "attain",
          "quick", "fast", "instant", "ready", "now", "today",
          "simple", "easy", "smooth", "seamless",
          "enable", "empower", "unlock", "access", "open", "discover",
          "explore", "try", "experience", "enjoy",
          "confirm", "verify", "check", "review", "approve", "accept",
          "agree", "proceed", "continue", "next",
        ],
      },
      {
        category: "clarity_safety",
        words: [
          "clear", "straightforward", "plain", "direct",
          "transparent", "honest",
          "trust", "rely", "depend", "count on", "believe",
          "sure", "certain", "guaranteed", "promised",
          "correct", "right", "accurate", "exact", "precise", "specific",
          "detailed", "comprehensive",
        ],
      },
      {
        category: "fixing_resolution",
        words: [
          "fix", "solve", "resolve", "address", "handle", "manage",
          "sort out", "take care of", "work on", "look into",
          "restore", "recover", "return", "bring back", "reset", "refresh",
          "renew", "restart", "reconnect",
          "sorted", "resolved", "fixed", "working", "good to go", "all set",
        ],
      },
      {
        category: "community_first",
        words: [
          "together", "community", "family", "neighbours",
          "include", "belong", "accessible", "available",
          "for all", "for everyone", "no matter", "regardless",
          "share", "contribute", "participate", "join", "connect",
          "bring together", "unite", "gather",
          "seva", "saath", "apna", "desh", "parivaar", "samaj",
        ],
      },
    ];

    for (const cat of vocabCategories) {
      for (const word of cat.words) {
        await insert({
          type: "preferred_word",
          category: cat.category,
          content: word,
          metadata: {
            source: "system_v1",
          },
          tags: ["preferred", cat.category, "tier1"],
          isActive: true,
          createdBy: "system",
        });
      }
    }

    // ── 3. Simple & Gender-Neutral Alternatives ──────────────────

    const alternatives: { from: string; to: string; altType: string }[] = [
      // Gender neutral
      { from: "Dear Sir", to: "Hello", altType: "gender_neutral" },
      { from: "Dear Madam", to: "Hello", altType: "gender_neutral" },
      { from: "Dear Sir/Madam", to: "Hello", altType: "gender_neutral" },
      { from: "chairman", to: "chairperson", altType: "gender_neutral" },
      { from: "chairwoman", to: "chairperson", altType: "gender_neutral" },
      { from: "businessman", to: "businessperson", altType: "gender_neutral" },
      { from: "businesswoman", to: "businessperson", altType: "gender_neutral" },
      { from: "fireman", to: "firefighter", altType: "gender_neutral" },
      { from: "policeman", to: "police officer", altType: "gender_neutral" },
      { from: "mailman", to: "mail carrier", altType: "gender_neutral" },
      { from: "stewardess", to: "flight attendant", altType: "gender_neutral" },
      { from: "mankind", to: "humankind", altType: "gender_neutral" },
      { from: "manpower", to: "workforce", altType: "gender_neutral" },
      { from: "man-made", to: "artificial", altType: "gender_neutral" },
      { from: "housewife", to: "homemaker", altType: "gender_neutral" },
      { from: "working mother", to: "working parent", altType: "gender_neutral" },
      // Simple alternatives
      { from: "utilize", to: "use", altType: "simplification" },
      { from: "facilitate", to: "help", altType: "simplification" },
      { from: "leverage", to: "use", altType: "simplification" },
      { from: "synergy", to: "working together", altType: "simplification" },
      { from: "paradigm", to: "approach", altType: "simplification" },
      { from: "bandwidth", to: "time", altType: "simplification" },
      { from: "circle back", to: "follow up", altType: "simplification" },
      { from: "deep dive", to: "look closely", altType: "simplification" },
      { from: "optimize", to: "improve", altType: "simplification" },
      { from: "streamline", to: "simplify", altType: "simplification" },
      { from: "robust", to: "strong", altType: "simplification" },
      { from: "seamless", to: "smooth", altType: "simplification" },
      { from: "frictionless", to: "easy", altType: "simplification" },
      { from: "cutting-edge", to: "latest", altType: "simplification" },
      { from: "state-of-the-art", to: "modern", altType: "simplification" },
      { from: "world-class", to: "excellent", altType: "simplification" },
      { from: "best-in-class", to: "high quality", altType: "simplification" },
    ];

    for (const alt of alternatives) {
      await insert({
        type: "auto_fix",
        category: alt.altType,
        content: alt.from,
        metadata: {
          suggestion: alt.to,
          source: "system_v1",
        },
        tags: ["auto_fix", alt.altType, "tier1"],
        isActive: true,
        createdBy: "system",
      });
    }

    // ── 4. Festivals ─────────────────────────────────────────────

    const festivals = [
      { name: "Diwali", month: 10, dayStart: 20, dayEnd: 30, tone: "celebratory, festive, light-filled", inclusive: true, greeting: "Happy Diwali!" },
      { name: "Holi", month: 3, dayStart: 8, dayEnd: 15, tone: "playful, colorful, joyous", inclusive: true, greeting: "Happy Holi!" },
      { name: "Eid", month: 0, dayStart: 1, dayEnd: 3, tone: "blessed, grateful, celebratory", inclusive: true, greeting: "Eid Mubarak!" },
      { name: "Christmas", month: 12, dayStart: 24, dayEnd: 26, tone: "warm, giving, festive", inclusive: true, greeting: "Merry Christmas!" },
      { name: "New Year", month: 1, dayStart: 1, dayEnd: 3, tone: "hopeful, fresh start, optimistic", inclusive: true, greeting: "Happy New Year!" },
      { name: "Independence Day", month: 8, dayStart: 15, dayEnd: 15, tone: "patriotic, proud, united", inclusive: true, greeting: "Happy Independence Day!" },
      { name: "Republic Day", month: 1, dayStart: 26, dayEnd: 26, tone: "patriotic, proud, celebratory", inclusive: true, greeting: "Happy Republic Day!" },
      { name: "Ganesh Chaturthi", month: 9, dayStart: 10, dayEnd: 20, tone: "devotional, joyous, community", inclusive: false, greeting: "Ganpati Bappa Morya!" },
      { name: "Navratri", month: 10, dayStart: 1, dayEnd: 10, tone: "spiritual, energetic, celebratory", inclusive: false, greeting: "Happy Navratri!" },
      { name: "Onam", month: 8, dayStart: 20, dayEnd: 30, tone: "harvest celebration, prosperity, togetherness", inclusive: false, greeting: "Happy Onam!" },
      { name: "Pongal", month: 1, dayStart: 14, dayEnd: 17, tone: "harvest celebration, gratitude, family", inclusive: false, greeting: "Happy Pongal!" },
    ];

    for (const fest of festivals) {
      await insert({
        type: "festival",
        category: fest.inclusive ? "pan_india" : "regional",
        content: fest.name,
        metadata: {
          suggestion: fest.greeting,
          source: "system_v1",
        },
        tags: ["festival", fest.inclusive ? "pan_india" : "regional", "tier1", fest.tone],
        isActive: true,
        createdBy: "system",
      });
    }

    // ── 5. Product/Ecosystem Definitions ─────────────────────────

    const ecosystems = [
      { id: "connectivity", name: "Connectivity", tone: "Quick, crisp, confident", keywords: "network,signal,data,recharge,plan,5G,4G,SIM" },
      { id: "home", name: "Home", tone: "Warm, familiar, relaxed", keywords: "fiber,broadband,wifi,router,home,family,streaming" },
      { id: "entertainment", name: "Entertainment", tone: "Playful, expressive, energetic", keywords: "movies,shows,music,streaming,watch,listen,live" },
      { id: "shopping", name: "Shopping", tone: "Helpful, cheerful, straight-talking", keywords: "order,delivery,cart,discount,offer,grocery,buy" },
      { id: "finance", name: "Finance", tone: "Calm, clear, trustworthy", keywords: "payment,UPI,wallet,bank,insurance,loan,money" },
      { id: "health", name: "Health", tone: "Caring, steady, informed", keywords: "doctor,medicine,health,wellness,appointment,pharmacy" },
      { id: "business", name: "Business", tone: "Sharp, professional, future-focused", keywords: "enterprise,business,cloud,solution,corporate,partner" },
      { id: "work", name: "Work", tone: "Respectful, sincere, supportive", keywords: "team,employee,announcement,policy,hr,training,career" },
      { id: "government", name: "Government", tone: "Formal, respectful, precise", keywords: "government,compliance,regulatory,official,mandate,citizen" },
      { id: "education", name: "Education", tone: "Encouraging, clear, inclusive", keywords: "learn,course,study,skill,education,class,student,teacher" },
      { id: "sports", name: "Sports", tone: "Bold, exciting, inclusive", keywords: "cricket,match,score,sports,team,player,stadium" },
      { id: "agriculture", name: "Agriculture", tone: "Respectful, practical, grounded", keywords: "farm,crop,weather,soil,mandi,kisan,harvest" },
      { id: "energy", name: "Energy", tone: "Forward-looking, optimistic, trustworthy", keywords: "solar,energy,power,battery,green,renewable,electricity" },
      { id: "transport", name: "Transport", tone: "Practical, reliable, community-focused", keywords: "ride,route,bus,metro,delivery,logistics,mobility" },
    ];

    for (const eco of ecosystems) {
      await insert({
        type: "product_definition",
        category: eco.id,
        content: `${eco.name}: ${eco.tone}`,
        metadata: {
          ecosystem: eco.id,
          source: "system_v1",
        },
        tags: ["product", "ecosystem", eco.id, "tier1", ...eco.keywords.split(",")],
        isActive: true,
        createdBy: "system",
      });
    }

    console.log(`Seeded ${count} knowledge items.`);
    return { status: "seeded", count };
  },
});

// ── Check Seed Status ────────────────────────────────────────────

export const checkSeedStatus = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("knowledgeItems").collect();
    const byType: Record<string, number> = {};
    for (const item of all) {
      byType[item.type] = (byType[item.type] || 0) + 1;
    }
    return { total: all.length, byType };
  },
});
