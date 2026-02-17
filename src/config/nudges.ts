/**
 * Nudge Configuration -- content data for the Nudge Controller
 *
 * Extracted from services/nudge/nudgeController.ts.
 * Edit nudge messages, CTAs, and permission thresholds here
 * without touching decision logic.
 * Source: Jio Conversational Engagement Framework
 */

/** Emotions that block nudges (sensitivity override) */
export const SENSITIVE_EMOTIONS = ['raudra', 'bhayanak', 'karun', 'bibhatsa'] as const;

/** Intents that block nudges */
export const SENSITIVE_INTENTS = ['complaint'] as const;

/** Resolution statuses that block non-critical nudges */
export const BLOCKED_RESOLUTION_STATUSES = ['blocked', 'escalated'] as const;

/** Default nudge permission by user segment */
export const SEGMENT_PERMISSIONS: Record<string, string> = {
  new: 'minimal',
  active: 'allowed',
  loyal: 'allowed',
  premium: 'ask_first',
  churning: 'never',
};

/** Relevance thresholds by permission level */
export const RELEVANCE_THRESHOLDS: Record<string, string[]> = {
  always: ['critical', 'high', 'medium', 'low', 'opportunistic'],
  allowed: ['critical', 'high', 'medium'],
  ask_first: ['critical', 'high'],
  minimal: ['critical'],
  never: [],
};

/** Standard nudges by ecosystem and context */
export const NUDGE_LIBRARY: Record<string, Array<{
  type: string;
  relevance: string;
  message: string;
  cta?: string;
  conditions?: Array<{ field: string; operator: string; value: number }>;
}>> = {
  jio_telecom: [
    {
      type: 'expiry_warning',
      relevance: 'critical',
      message: 'your plan expires in 2 days. recharge now to avoid service interruption.',
      cta: 'recharge now',
      conditions: [{ field: 'daysToExpiry', operator: 'lt', value: 3 }],
    },
    {
      type: 'upsell',
      relevance: 'high',
      message: 'get 50% more data with the annual plan - same monthly cost.',
      cta: 'view plans',
    },
    {
      type: 'feature_discovery',
      relevance: 'medium',
      message: 'did you know? you can check your data usage anytime in the MyJio app.',
      cta: 'open myjio',
    },
    {
      type: 'offer',
      relevance: 'medium',
      message: 'special weekend offer: extra 2GB data on recharge above ₹299.',
      cta: 'claim offer',
    },
  ],
  jio_fiber: [
    {
      type: 'expiry_warning',
      relevance: 'critical',
      message: 'your JioFiber bill is due in 3 days. pay now to avoid disconnection.',
      cta: 'pay bill',
    },
    {
      type: 'upsell',
      relevance: 'high',
      message: 'upgrade to 500Mbps and get JioCinema Premium free for 3 months.',
      cta: 'upgrade plan',
    },
    {
      type: 'tip',
      relevance: 'low',
      message: 'tip: place your router centrally for better wifi coverage throughout your home.',
    },
  ],
  jio_cinema: [
    {
      type: 'cross_sell',
      relevance: 'medium',
      message: 'enjoy ad-free viewing with JioCinema Premium.',
      cta: 'try premium',
    },
    {
      type: 'feature_discovery',
      relevance: 'low',
      message: 'you can download shows to watch offline in the JioCinema app.',
    },
  ],
  jio_mart: [
    {
      type: 'reminder',
      relevance: 'medium',
      message: 'you have items in your cart. complete your order before prices change.',
      cta: 'view cart',
      conditions: [{ field: 'cartItems', operator: 'gt', value: 0 }],
    },
    {
      type: 'offer',
      relevance: 'high',
      message: 'free delivery on orders above ₹499 today only.',
      cta: 'shop now',
    },
  ],
};
