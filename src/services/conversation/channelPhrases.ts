/**
 * Channel-Specific Opening/Closing Phrases (Phase 3.2)
 * 
 * Replaces generic greetings with channel-appropriate phrases.
 * Each channel has unique constraints and user expectations.
 * 
 * @module services/conversation/channelPhrases
 */

import type { ContentChannelType, ConversationState } from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface ChannelPhrases {
  /** Opening phrases for different states */
  opening: {
    /** Initial greeting - first contact */
    initial: string[];
    /** Returning user - continuation */
    returning: string[];
    /** After hold/wait */
    resuming: string[];
  };
  /** Closing phrases for different states */
  closing: {
    /** Issue resolved */
    resolved: string[];
    /** Issue pending/in progress */
    pending: string[];
    /** Handing off to human */
    escalating: string[];
    /** User leaving without resolution */
    abandoned: string[];
  };
  /** Transition phrases within conversation */
  transitions: {
    /** Moving to gather more info */
    toInfoGathering: string[];
    /** Starting to process */
    toProcessing: string[];
    /** Providing solution */
    toResolution: string[];
    /** Asking for confirmation */
    toConfirmation: string[];
  };
  /** Channel-specific constraints */
  constraints: {
    maxLength?: number;
    skipGreeting?: boolean;
    formalityLevel: 'casual' | 'balanced' | 'formal';
    allowEmoji: boolean;
    requiresAcknowledgment: boolean;
  };
}

// =============================================================================
// Channel Phrase Library
// =============================================================================

export const CHANNEL_PHRASES: Record<ContentChannelType, ChannelPhrases> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // QUICK MESSAGES - Short, direct, no fluff
  // ═══════════════════════════════════════════════════════════════════════════
  
  push_notification: {
    opening: {
      initial: [], // Push notifications don't have opening greetings
      returning: [],
      resuming: [],
    },
    closing: {
      resolved: ['Tap to view more'],
      pending: ['We\'ll notify you when ready'],
      escalating: [],
      abandoned: [],
    },
    transitions: {
      toInfoGathering: [],
      toProcessing: [],
      toResolution: ['Tap to view'],
      toConfirmation: [],
    },
    constraints: {
      maxLength: 50,
      skipGreeting: true,
      formalityLevel: 'casual',
      allowEmoji: false,
      requiresAcknowledgment: false,
    },
  },
  
  sms: {
    opening: {
      initial: ['Jio:'], // Brand prefix only
      returning: ['Jio:'],
      resuming: ['Jio:'],
    },
    closing: {
      resolved: ['Reply HELP for more options'],
      pending: ['We\'ll update you shortly'],
      escalating: ['Call 199 for assistance'],
      abandoned: ['Reply HELP anytime'],
    },
    transitions: {
      toInfoGathering: ['Reply with'],
      toProcessing: [],
      toResolution: [],
      toConfirmation: ['Reply Y to confirm'],
    },
    constraints: {
      maxLength: 160,
      skipGreeting: true,
      formalityLevel: 'balanced',
      allowEmoji: false,
      requiresAcknowledgment: false,
    },
  },
  
  whatsapp_alert: {
    opening: {
      initial: ['Hi!'], // Brief, friendly
      returning: ['Hey again!'],
      resuming: ['Thanks for waiting!'],
    },
    closing: {
      resolved: ['Need anything else? Just message us!'],
      pending: ['We\'ll message you once it\'s ready'],
      escalating: ['Our team will reach out shortly'],
      abandoned: ['We\'re here whenever you need us'],
    },
    transitions: {
      toInfoGathering: ['Quick question:'],
      toProcessing: ['Checking this for you...'],
      toResolution: ['Here\'s the update:'],
      toConfirmation: ['Does this help?'],
    },
    constraints: {
      maxLength: 500,
      skipGreeting: false,
      formalityLevel: 'casual',
      allowEmoji: true,
      requiresAcknowledgment: false,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPORT & CHAT - Conversational, empathetic
  // ═══════════════════════════════════════════════════════════════════════════
  
  customer_care_chat: {
    opening: {
      initial: [
        'Hi there! I\'m here to help. What can I assist you with today?',
        'Hello! Welcome to Jio support. How may I help you?',
        'Namaste! I\'m your Jio assistant. What brings you here today?',
      ],
      returning: [
        'Welcome back! How can I help you today?',
        'Good to see you again! What can I assist with?',
      ],
      resuming: [
        'Thanks for waiting! I\'m back with you now.',
        'Apologies for the wait. Let me continue helping you.',
      ],
    },
    closing: {
      resolved: [
        'Happy to help! Is there anything else you need?',
        'Glad I could assist! Let me know if you have other questions.',
        'Great! Feel free to reach out anytime.',
      ],
      pending: [
        'I\'ve logged this for you. We\'ll update you within [timeframe].',
        'Your request is being processed. You\'ll hear from us soon.',
      ],
      escalating: [
        'I\'m connecting you with a specialist who can better assist.',
        'Our senior team will reach out to you shortly.',
      ],
      abandoned: [
        'I\'m here if you need to continue. Just message anytime.',
        'Feel free to come back whenever you\'re ready.',
      ],
    },
    transitions: {
      toInfoGathering: [
        'To help you better, could you share...',
        'I\'ll need a few details to assist you properly.',
        'Let me understand this better.',
      ],
      toProcessing: [
        'Let me check that for you.',
        'Give me a moment to look into this.',
        'I\'m pulling up your details now.',
      ],
      toResolution: [
        'Here\'s what I found.',
        'I have the information you need.',
        'Good news! Here\'s the solution.',
      ],
      toConfirmation: [
        'Did this resolve your concern?',
        'Is there anything else you\'d like me to clarify?',
        'Does this answer your question?',
      ],
    },
    constraints: {
      maxLength: 1000,
      skipGreeting: false,
      formalityLevel: 'balanced',
      allowEmoji: true,
      requiresAcknowledgment: true,
    },
  },
  
  whatsapp_support: {
    opening: {
      initial: [
        'Hey! Thanks for reaching out. How can I help?',
        'Hi there! What can I assist you with today?',
        'Hello! I\'m here to help. What\'s on your mind?',
      ],
      returning: [
        'Hey, welcome back! What can I do for you?',
        'Good to hear from you again! How can I help?',
      ],
      resuming: [
        'Thanks for your patience! Let\'s continue.',
        'Sorry for the wait. I\'m back to help you.',
      ],
    },
    closing: {
      resolved: [
        'Glad I could help! Reach out anytime.',
        'Happy to assist! Message us whenever you need.',
        'All sorted! We\'re always here for you.',
      ],
      pending: [
        'I\'ve noted this down. We\'ll get back to you soon.',
        'Working on it! You\'ll receive an update shortly.',
      ],
      escalating: [
        'Connecting you with our team. They\'ll message you shortly.',
        'Our specialist will reach out within [timeframe].',
      ],
      abandoned: [
        'No problem! Message us anytime you\'re ready.',
        'We\'re here whenever you need us.',
      ],
    },
    transitions: {
      toInfoGathering: [
        'Quick question - could you share...',
        'To help you faster, I\'ll need...',
      ],
      toProcessing: [
        'Checking now...',
        'Give me a sec to look into this.',
        'Let me pull that up for you.',
      ],
      toResolution: [
        'Found it! Here\'s what you need to know:',
        'Here you go:',
        'Got the info for you:',
      ],
      toConfirmation: [
        'Does that help?',
        'All good now?',
        'Anything else you need?',
      ],
    },
    constraints: {
      maxLength: 800,
      skipGreeting: false,
      formalityLevel: 'casual',
      allowEmoji: true,
      requiresAcknowledgment: false,
    },
  },
  
  chatbot_faq: {
    opening: {
      initial: [
        'Hi! I can help you find quick answers. What would you like to know?',
        'Hello! Ask me anything about Jio services.',
        'Welcome! How can I assist you today?',
      ],
      returning: [
        'Back for more info? Happy to help!',
        'What else would you like to know?',
      ],
      resuming: [
        'Let\'s continue. What else can I help with?',
      ],
    },
    closing: {
      resolved: [
        'Found what you needed? Great! Ask me anything else.',
        'Happy to help! Any other questions?',
      ],
      pending: [
        'For this query, our support team can help better. Would you like to connect?',
      ],
      escalating: [
        'Let me connect you to live support for this.',
        'Transferring you to an agent who can help better.',
      ],
      abandoned: [
        'Come back anytime you have questions!',
      ],
    },
    transitions: {
      toInfoGathering: [
        'To give you the right answer, please tell me...',
        'Which of these best describes your question?',
      ],
      toProcessing: [
        'Looking that up for you...',
        'Let me find the answer.',
      ],
      toResolution: [
        'Here\'s what I found:',
        'Based on your question:',
      ],
      toConfirmation: [
        'Did this answer your question?',
        'Helpful? Any follow-up questions?',
      ],
    },
    constraints: {
      maxLength: 600,
      skipGreeting: false,
      formalityLevel: 'balanced',
      allowEmoji: true,
      requiresAcknowledgment: false,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE - Spoken format, clear and natural
  // ═══════════════════════════════════════════════════════════════════════════
  
  ivr_voice_menu: {
    opening: {
      initial: [
        'Welcome to Jio customer care.',
        'Thank you for calling Jio.',
        'Namaste! Welcome to Jio support.',
      ],
      returning: [
        'Welcome back to Jio.',
      ],
      resuming: [
        'Thank you for holding. How may I help you?',
      ],
    },
    closing: {
      resolved: [
        'Thank you for calling Jio. Have a great day!',
        'Glad we could help. Thank you for choosing Jio.',
      ],
      pending: [
        'We\'ll process your request and call you back.',
        'Your request is noted. Expect a callback within 24 hours.',
      ],
      escalating: [
        'Please hold while I transfer you to an agent.',
        'Connecting you to our support team now.',
      ],
      abandoned: [
        'Thank you for calling. Feel free to call back anytime.',
      ],
    },
    transitions: {
      toInfoGathering: [
        'Please enter or say...',
        'For faster service, please provide...',
      ],
      toProcessing: [
        'Please hold while I check that.',
        'One moment please.',
      ],
      toResolution: [
        'Here\'s what I found.',
        'Based on your account,',
      ],
      toConfirmation: [
        'Would you like to proceed?',
        'Please confirm by pressing 1.',
      ],
    },
    constraints: {
      maxLength: 200,
      skipGreeting: false,
      formalityLevel: 'formal',
      allowEmoji: false,
      requiresAcknowledgment: true,
    },
  },
  
  voice_assistant: {
    opening: {
      initial: [
        'Hi there! How can I help you today?',
        'Hello! What would you like to do?',
        'Hey! I\'m your Jio assistant. What can I do for you?',
      ],
      returning: [
        'Welcome back! What can I help with?',
        'Hey again! What do you need?',
      ],
      resuming: [
        'I\'m back! Let\'s continue.',
        'Ready to help! Where were we?',
      ],
    },
    closing: {
      resolved: [
        'All done! Anything else?',
        'Happy to help! Just say "Hey Jio" if you need me.',
        'That\'s sorted! Let me know if you need more help.',
      ],
      pending: [
        'I\'ll keep working on that. Check back with me later.',
        'This might take a bit. I\'ll notify you when ready.',
      ],
      escalating: [
        'Let me get a human to help with this.',
        'I\'ll connect you to support for this one.',
      ],
      abandoned: [
        'Okay! Just say "Hey Jio" whenever you need me.',
        'No problem. I\'m here when you need me.',
      ],
    },
    transitions: {
      toInfoGathering: [
        'I need to know a few things first.',
        'Quick question:',
        'Can you tell me...',
      ],
      toProcessing: [
        'Let me check that.',
        'Working on it...',
        'Give me a moment.',
      ],
      toResolution: [
        'Here\'s what I found.',
        'Got it!',
        'Here you go.',
      ],
      toConfirmation: [
        'Sound good?',
        'Want me to proceed?',
        'Shall I do that?',
      ],
    },
    constraints: {
      maxLength: 150,
      skipGreeting: false,
      formalityLevel: 'casual',
      allowEmoji: false,
      requiresAcknowledgment: true,
    },
  },
  
  voice_prompts: {
    opening: {
      initial: [],
      returning: [],
      resuming: [],
    },
    closing: {
      resolved: [],
      pending: [],
      escalating: [],
      abandoned: [],
    },
    transitions: {
      toInfoGathering: [],
      toProcessing: ['Processing...'],
      toResolution: [],
      toConfirmation: ['Please confirm.'],
    },
    constraints: {
      maxLength: 50,
      skipGreeting: true,
      formalityLevel: 'balanced',
      allowEmoji: false,
      requiresAcknowledgment: false,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL - Formal structure, complete context
  // ═══════════════════════════════════════════════════════════════════════════
  
  marketing_email: {
    opening: {
      initial: [
        'Dear valued customer,',
        'Hello!',
        'Great news!',
      ],
      returning: [
        'We thought you\'d like to know...',
        'Here\'s something special for you!',
      ],
      resuming: [],
    },
    closing: {
      resolved: [
        'With Jio love,\nThe Jio Team',
        'Best regards,\nTeam Jio',
        'Warm wishes,\nJio',
      ],
      pending: [
        'Stay tuned for more!\nTeam Jio',
      ],
      escalating: [],
      abandoned: [],
    },
    transitions: {
      toInfoGathering: [],
      toProcessing: [],
      toResolution: [
        'Here\'s what\'s in store:',
        'We\'re excited to share:',
      ],
      toConfirmation: [
        'Interested? Here\'s how to get started:',
      ],
    },
    constraints: {
      maxLength: 2000,
      skipGreeting: false,
      formalityLevel: 'balanced',
      allowEmoji: true,
      requiresAcknowledgment: false,
    },
  },
  
  transactional_email: {
    opening: {
      initial: [
        'Dear customer,',
        'Namaste,',
      ],
      returning: [
        'As requested,',
        'Following up on your request,',
      ],
      resuming: [],
    },
    closing: {
      resolved: [
        'If you have any questions, please contact us at [support channel].\n\nRegards,\nJio Customer Service',
        'Thank you for choosing Jio.\n\nBest regards,\nJio Team',
      ],
      pending: [
        'We\'ll keep you updated on the progress.\n\nRegards,\nJio Customer Service',
      ],
      escalating: [
        'Our team will reach out to you within [timeframe].\n\nRegards,\nJio Customer Service',
      ],
      abandoned: [],
    },
    transitions: {
      toInfoGathering: [],
      toProcessing: [],
      toResolution: [
        'Here are the details of your transaction:',
        'Please find your [document type] below:',
      ],
      toConfirmation: [],
    },
    constraints: {
      maxLength: 3000,
      skipGreeting: false,
      formalityLevel: 'formal',
      allowEmoji: false,
      requiresAcknowledgment: false,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MARKETING & ADS - Punchy, action-oriented
  // ═══════════════════════════════════════════════════════════════════════════
  
  social_media_post: {
    opening: {
      initial: [], // Social posts often don't have traditional openings
      returning: [],
      resuming: [],
    },
    closing: {
      resolved: [
        'Link in bio!',
        'Tap to learn more',
        '#JioForAll',
      ],
      pending: [],
      escalating: [],
      abandoned: [],
    },
    transitions: {
      toInfoGathering: [],
      toProcessing: [],
      toResolution: [],
      toConfirmation: ['What do you think? Comment below!'],
    },
    constraints: {
      maxLength: 280,
      skipGreeting: true,
      formalityLevel: 'casual',
      allowEmoji: true,
      requiresAcknowledgment: false,
    },
  },
  
  digital_ads: {
    opening: {
      initial: [],
      returning: [],
      resuming: [],
    },
    closing: {
      resolved: [
        'Get started today!',
        'Try now',
        'Learn more',
      ],
      pending: [],
      escalating: [],
      abandoned: [],
    },
    transitions: {
      toInfoGathering: [],
      toProcessing: [],
      toResolution: [],
      toConfirmation: [],
    },
    constraints: {
      maxLength: 90,
      skipGreeting: true,
      formalityLevel: 'casual',
      allowEmoji: false,
      requiresAcknowledgment: false,
    },
  },
  
  tv_video_ad: {
    opening: {
      initial: [],
      returning: [],
      resuming: [],
    },
    closing: {
      resolved: [
        'Jio. Jo jeeta hai, woh Jio hai.',
        'Jio. Live the life.',
      ],
      pending: [],
      escalating: [],
      abandoned: [],
    },
    transitions: {
      toInfoGathering: [],
      toProcessing: [],
      toResolution: [],
      toConfirmation: [],
    },
    constraints: {
      maxLength: 100,
      skipGreeting: true,
      formalityLevel: 'casual',
      allowEmoji: false,
      requiresAcknowledgment: false,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // IN-APP & WEB
  // ═══════════════════════════════════════════════════════════════════════════
  
  app_notification: {
    opening: {
      initial: [],
      returning: [],
      resuming: [],
    },
    closing: {
      resolved: ['Tap to view'],
      pending: ['We\'ll notify you when ready'],
      escalating: [],
      abandoned: [],
    },
    transitions: {
      toInfoGathering: [],
      toProcessing: [],
      toResolution: [],
      toConfirmation: [],
    },
    constraints: {
      maxLength: 100,
      skipGreeting: true,
      formalityLevel: 'casual',
      allowEmoji: true,
      requiresAcknowledgment: false,
    },
  },
  
  onboarding_screen: {
    opening: {
      initial: [
        'Welcome to Jio!',
        'Let\'s get you started',
        'Glad you\'re here!',
      ],
      returning: [
        'Welcome back!',
        'Good to see you again!',
      ],
      resuming: [
        'Let\'s continue where you left off',
        'Almost there!',
      ],
    },
    closing: {
      resolved: [
        'You\'re all set!',
        'Ready to go!',
        'Let\'s explore!',
      ],
      pending: [
        'Just a few more steps...',
        'Almost done!',
      ],
      escalating: [
        'Need help? Contact support',
      ],
      abandoned: [
        'Come back anytime to complete setup',
      ],
    },
    transitions: {
      toInfoGathering: [
        'Tell us about yourself',
        'We need a few details',
      ],
      toProcessing: [
        'Setting things up...',
        'Almost ready...',
      ],
      toResolution: [
        'Here\'s what you get:',
        'Your account is ready!',
      ],
      toConfirmation: [
        'Look good? Let\'s continue',
        'Ready to proceed?',
      ],
    },
    constraints: {
      maxLength: 200,
      skipGreeting: false,
      formalityLevel: 'casual',
      allowEmoji: true,
      requiresAcknowledgment: false,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL
  // ═══════════════════════════════════════════════════════════════════════════
  
  internal_announcement: {
    opening: {
      initial: [
        'Team,',
        'Hi everyone,',
        'Colleagues,',
      ],
      returning: [],
      resuming: [],
    },
    closing: {
      resolved: [
        'Thank you,\n[Sender Name/Team]',
        'Best,\n[Team Name]',
      ],
      pending: [
        'More updates to follow.\n[Team Name]',
      ],
      escalating: [],
      abandoned: [],
    },
    transitions: {
      toInfoGathering: [],
      toProcessing: [],
      toResolution: [
        'Here\'s what you need to know:',
        'Key updates:',
      ],
      toConfirmation: [
        'Please confirm receipt by [date]',
        'Questions? Reach out to [contact]',
      ],
    },
    constraints: {
      maxLength: 1500,
      skipGreeting: false,
      formalityLevel: 'balanced',
      allowEmoji: false,
      requiresAcknowledgment: true,
    },
  },
  
  training_module: {
    opening: {
      initial: [
        'Welcome to this training module!',
        'Let\'s learn together.',
        'Ready to explore?',
      ],
      returning: [
        'Welcome back! Let\'s continue learning.',
      ],
      resuming: [
        'Let\'s pick up where you left off.',
      ],
    },
    closing: {
      resolved: [
        'Great job completing this module!',
        'You\'ve learned the key concepts. Test your knowledge!',
        'Well done! Ready for the next module?',
      ],
      pending: [
        'You\'re making progress! Continue when ready.',
      ],
      escalating: [
        'Need help? Contact your trainer.',
      ],
      abandoned: [
        'Your progress is saved. Come back anytime!',
      ],
    },
    transitions: {
      toInfoGathering: [
        'Think about this:',
        'Before we proceed, consider:',
      ],
      toProcessing: [
        'Let\'s explore this concept.',
        'Here\'s an important topic:',
      ],
      toResolution: [
        'Key takeaway:',
        'Remember:',
        'Important point:',
      ],
      toConfirmation: [
        'Ready to test your understanding?',
        'Let\'s check what you\'ve learned.',
      ],
    },
    constraints: {
      maxLength: 2000,
      skipGreeting: false,
      formalityLevel: 'balanced',
      allowEmoji: true,
      requiresAcknowledgment: false,
    },
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get channel-specific phrases
 */
export function getChannelPhrases(channel: ContentChannelType): ChannelPhrases {
  return CHANNEL_PHRASES[channel];
}

/**
 * Get opening phrase for channel and context
 */
export function getOpeningPhrase(
  channel: ContentChannelType,
  context: 'initial' | 'returning' | 'resuming' = 'initial',
): string | null {
  const phrases = CHANNEL_PHRASES[channel];
  
  if (phrases.constraints.skipGreeting) {
    return null;
  }
  
  const options = phrases.opening[context];
  if (!options || options.length === 0) {
    // Fall back to initial if specific context not available
    if (context !== 'initial' && phrases.opening.initial.length > 0) {
      return phrases.opening.initial[Math.floor(Math.random() * phrases.opening.initial.length)];
    }
    return null;
  }
  
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get closing phrase for channel and context
 */
export function getClosingPhrase(
  channel: ContentChannelType,
  context: 'resolved' | 'pending' | 'escalating' | 'abandoned' = 'resolved',
): string | null {
  const phrases = CHANNEL_PHRASES[channel];
  const options = phrases.closing[context];
  
  if (!options || options.length === 0) {
    // Fall back to resolved if specific context not available
    if (context !== 'resolved' && phrases.closing.resolved.length > 0) {
      return phrases.closing.resolved[Math.floor(Math.random() * phrases.closing.resolved.length)];
    }
    return null;
  }
  
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get transition phrase for channel and state change
 */
export function getTransitionPhrase(
  channel: ContentChannelType,
  transition: 'toInfoGathering' | 'toProcessing' | 'toResolution' | 'toConfirmation',
): string | null {
  const phrases = CHANNEL_PHRASES[channel];
  const options = phrases.transitions[transition];
  
  if (!options || options.length === 0) {
    return null;
  }
  
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get channel constraints
 */
export function getChannelConstraints(channel: ContentChannelType): ChannelPhrases['constraints'] {
  return CHANNEL_PHRASES[channel].constraints;
}

/**
 * Generate prompt instructions for channel-specific phrasing
 */
export function getChannelPhrasingInstructions(channel: ContentChannelType): string {
  const phrases = CHANNEL_PHRASES[channel];
  const { constraints } = phrases;
  
  const lines: string[] = [
    `## Channel: ${channel}`,
    '',
  ];
  
  // Constraints
  if (constraints.maxLength) {
    lines.push(`- Max length: ${constraints.maxLength} characters`);
  }
  lines.push(`- Formality: ${constraints.formalityLevel}`);
  lines.push(`- Emoji: ${constraints.allowEmoji ? 'allowed' : 'not allowed'}`);
  
  if (constraints.skipGreeting) {
    lines.push('- Skip greetings: get straight to the point');
  }
  
  lines.push('');
  
  // Opening examples
  const initialOpenings = phrases.opening.initial;
  if (initialOpenings.length > 0) {
    lines.push('**Opening examples:**');
    initialOpenings.slice(0, 2).forEach(o => lines.push(`- "${o}"`));
    lines.push('');
  }
  
  // Closing examples
  const resolvedClosings = phrases.closing.resolved;
  if (resolvedClosings.length > 0) {
    lines.push('**Closing examples:**');
    resolvedClosings.slice(0, 2).forEach(c => lines.push(`- "${c}"`));
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Map conversation state to closing context
 */
export function stateToClosingContext(
  state: ConversationState,
  isResolved: boolean,
): 'resolved' | 'pending' | 'escalating' | 'abandoned' {
  if (state === 'escalation') return 'escalating';
  if (state === 'abandoned') return 'abandoned';
  if (isResolved || state === 'closing') return 'resolved';
  return 'pending';
}

/**
 * Map conversation state to transition type
 */
export function stateToTransition(
  toState: ConversationState,
): 'toInfoGathering' | 'toProcessing' | 'toResolution' | 'toConfirmation' | null {
  switch (toState) {
    case 'information_gathering':
      return 'toInfoGathering';
    case 'processing':
      return 'toProcessing';
    case 'resolution':
      return 'toResolution';
    case 'confirmation':
      return 'toConfirmation';
    default:
      return null;
  }
}
