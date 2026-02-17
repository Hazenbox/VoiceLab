/**
 * Signature Templates -- content data for the Signature Selector
 *
 * Extracted from services/finishing/signatureSelector.ts.
 * Edit phrases here without touching selection logic.
 * Source: Jio Conversational Engagement Framework
 */

export type SignatureType = 'youre_all_set' | 'thank_you' | 'with_love' | 'take_care' | 'reach_out_anytime' | 'none';

export interface Signature {
  type: SignatureType;
  variations: string[];
  tone: 'professional' | 'warm' | 'casual';
}

export const SIGNATURES: Record<SignatureType, Signature> = {
  youre_all_set: {
    type: 'youre_all_set',
    variations: [
      "you're all set!",
      "all done!",
      "that's taken care of!",
      "you're good to go!",
      "everything is sorted!",
    ],
    tone: 'professional',
  },
  thank_you: {
    type: 'thank_you',
    variations: [
      "thank you for reaching out!",
      "thanks for contacting us!",
      "thank you for your patience!",
      "thanks for giving us the chance to help!",
    ],
    tone: 'professional',
  },
  with_love: {
    type: 'with_love',
    variations: [
      "take care, and stay connected!",
      "wishing you a great day ahead!",
      "here's to smooth connectivity!",
      "stay connected, stay happy!",
    ],
    tone: 'warm',
  },
  take_care: {
    type: 'take_care',
    variations: [
      "take care!",
      "have a great day!",
      "have a wonderful day!",
      "wishing you all the best!",
    ],
    tone: 'warm',
  },
  reach_out_anytime: {
    type: 'reach_out_anytime',
    variations: [
      "feel free to reach out anytime you need help!",
      "i'm here whenever you need assistance!",
      "don't hesitate to reach out if you have more questions!",
      "always happy to help - just reach out!",
    ],
    tone: 'casual',
  },
  none: {
    type: 'none',
    variations: [],
    tone: 'professional',
  },
};
