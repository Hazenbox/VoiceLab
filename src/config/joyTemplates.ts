/**
 * Joy Templates -- content data for the Small Joy Engine
 *
 * Extracted from services/finishing/smallJoyEngine.ts.
 * Edit phrases here without touching generation logic.
 * Source: Jio Conversational Engagement Framework
 */

export type JoyType = 'celebratory' | 'empathetic' | 'reassuring' | 'playful' | 'insider' | 'none';

export const JOY_TEMPLATES: Record<JoyType, {
  generic: string[];
  confident?: string[];
  byDomain: Record<string, string[]>;
  confidentByDomain?: Record<string, string[]>;
}> = {
  celebratory: {
    generic: [
      "congrats on getting this sorted!",
      "great job - you did it!",
      "that's a win!",
      "look at you, crushing it!",
    ],
    byDomain: {
      recharge: [
        "you're all charged up and ready to roll!",
        "your account is topped up and glowing!",
      ],
      activation: [
        "welcome to the Jio family!",
        "your journey with Jio begins now!",
      ],
      upgrade: [
        "welcome to the premium experience!",
        "you've unlocked a whole new level!",
      ],
      porting: [
        "welcome aboard - great choice!",
        "smart move, joining the Jio family!",
      ],
    },
  },
  empathetic: {
    generic: [
      "i totally get it",
      "that sounds frustrating, let's fix it",
      "i hear you",
      "i understand how that feels",
    ],
    byDomain: {
      network: [
        "connection issues are the worst - let's get you back online",
      ],
      billing: [
        "unexpected charges are always stressful - let's clear this up",
      ],
      complaint: [
        "you shouldn't have to deal with this - i'm here to help",
      ],
    },
  },
  reassuring: {
    generic: [
      "let's look into this together",
      "let me help you with this",
      "i'll do my best to help",
      "let's see what we can do",
    ],
    confident: [
      "don't worry, we'll sort this out",
      "you're in good hands",
      "we've got your back",
      "this is totally fixable",
    ],
    byDomain: {
      payment: [
        "let me check on this transaction for you",
      ],
      data: [
        "let me look into your data usage",
      ],
      account: [
        "let me check your account details",
      ],
    },
    confidentByDomain: {
      payment: [
        "your money is safe - let's track it down",
      ],
      data: [
        "your data isn't going anywhere",
      ],
      account: [
        "your account is secure with us",
      ],
    },
  },
  playful: {
    generic: [
      "easy peasy!",
      "piece of cake!",
      "done and dusted!",
      "simpler than ordering chai!",
    ],
    byDomain: {
      streaming: [
        "now you're ready for your binge session!",
        "grab the popcorn, you're all set!",
      ],
      data: [
        "stream away!",
        "data party incoming!",
      ],
    },
  },
  insider: {
    generic: [
      "pro tip:",
      "here's a little secret:",
      "between you and me:",
      "not everyone knows this, but:",
    ],
    byDomain: {
      plans: [
        "insider tip: this plan gives you the best value for unlimited calling",
      ],
      app: [
        "pro tip: you can do this even faster in the MyJio app",
      ],
      offers: [
        "here's something special just for you:",
      ],
    },
  },
  none: {
    generic: [],
    byDomain: {},
  },
};

export const MILESTONE_TEMPLATES: Record<string, string[]> = {
  first_recharge: [
    "your first recharge with us - welcome!",
    "first of many - welcome to the family!",
  ],
  anniversary: [
    "happy anniversary with Jio!",
    "thanks for being with us this year!",
  ],
  loyal_customer: [
    "thanks for being such a valued customer!",
    "we appreciate your loyalty!",
  ],
  issue_resolved: [
    "glad we could sort this out!",
    "happy to have helped!",
  ],
};
