/**
 * Timing Engine
 * 
 * Automatically detects timing context (time of day, day of week, festivals)
 * and provides guidance for content tone adjustments.
 * 
 * Rules from Jio Brand Guidelines:
 * - Never sell at night (10pm-6am): only urgent alerts
 * - Morning = motivating; Afternoon = quick; Evening = warm; Night = calm
 * - Weekend = more playful, social
 * 
 * @module services/context/timingEngine
 */

import type { TimingContext } from '../../types';

/**
 * Time of day categories
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'late_night';

/**
 * Day of week categories
 */
export type DayOfWeek = 'weekday' | 'weekend';

/**
 * Indian festival definitions
 */
export interface Festival {
  id: string;
  name: string;
  month: number;       // 1-12
  dayStart: number;
  dayEnd: number;
  greeting: string;
  tone: string;
  inclusive: boolean;  // True if should be celebrated pan-India
}

/**
 * Major Indian festivals (approximate dates, varies by year)
 * Note: In production, use a proper calendar API for exact dates
 */
export const FESTIVALS: readonly Festival[] = [
  {
    id: 'diwali',
    name: 'Diwali',
    month: 10,  // October/November (varies)
    dayStart: 20,
    dayEnd: 30,
    greeting: 'Happy Diwali! 🪔',
    tone: 'celebratory, festive, light-filled',
    inclusive: true,
  },
  {
    id: 'holi',
    name: 'Holi',
    month: 3,  // March (varies)
    dayStart: 8,
    dayEnd: 15,
    greeting: 'Happy Holi! 🎨',
    tone: 'playful, colorful, joyous',
    inclusive: true,
  },
  {
    id: 'eid',
    name: 'Eid',
    month: 0,  // Varies significantly
    dayStart: 1,
    dayEnd: 3,
    greeting: 'Eid Mubarak! 🌙',
    tone: 'blessed, grateful, celebratory',
    inclusive: true,
  },
  {
    id: 'christmas',
    name: 'Christmas',
    month: 12,
    dayStart: 24,
    dayEnd: 26,
    greeting: 'Merry Christmas! 🎄',
    tone: 'warm, giving, festive',
    inclusive: true,
  },
  {
    id: 'new_year',
    name: 'New Year',
    month: 1,
    dayStart: 1,
    dayEnd: 3,
    greeting: 'Happy New Year! 🎉',
    tone: 'hopeful, fresh start, optimistic',
    inclusive: true,
  },
  {
    id: 'independence_day',
    name: 'Independence Day',
    month: 8,
    dayStart: 15,
    dayEnd: 15,
    greeting: 'Happy Independence Day! 🇮🇳',
    tone: 'patriotic, proud, united',
    inclusive: true,
  },
  {
    id: 'republic_day',
    name: 'Republic Day',
    month: 1,
    dayStart: 26,
    dayEnd: 26,
    greeting: 'Happy Republic Day! 🇮🇳',
    tone: 'patriotic, proud, celebratory',
    inclusive: true,
  },
  {
    id: 'ganesh_chaturthi',
    name: 'Ganesh Chaturthi',
    month: 9,  // September (varies)
    dayStart: 10,
    dayEnd: 20,
    greeting: 'Ganpati Bappa Morya! 🙏',
    tone: 'devotional, joyous, community',
    inclusive: false,  // Regional (Maharashtra, parts of South)
  },
  {
    id: 'navratri',
    name: 'Navratri',
    month: 10,  // October (varies)
    dayStart: 1,
    dayEnd: 10,
    greeting: 'Happy Navratri! 🙏',
    tone: 'spiritual, energetic, celebratory',
    inclusive: false,  // Regional (Gujarat, North India)
  },
  {
    id: 'onam',
    name: 'Onam',
    month: 8,  // August/September (varies)
    dayStart: 20,
    dayEnd: 30,
    greeting: 'Happy Onam! 🌺',
    tone: 'harvest celebration, prosperity, togetherness',
    inclusive: false,  // Regional (Kerala)
  },
  {
    id: 'pongal',
    name: 'Pongal',
    month: 1,
    dayStart: 14,
    dayEnd: 17,
    greeting: 'Happy Pongal! 🌾',
    tone: 'harvest celebration, gratitude, family',
    inclusive: false,  // Regional (Tamil Nadu)
  },
] as const;

/**
 * Special events that affect communication
 */
export interface SpecialEvent {
  id: string;
  name: string;
  tone: string;
  guidance: string;
}

export const SPECIAL_EVENTS: readonly SpecialEvent[] = [
  {
    id: 'cricket_match',
    name: 'Cricket Match Day',
    tone: 'exciting, sporty, engaged',
    guidance: 'Users may be distracted. Keep messages brief. Cricket references OK.',
  },
  {
    id: 'exam_season',
    name: 'Exam Season',
    tone: 'focused, supportive, quiet',
    guidance: 'Students and parents stressed. Avoid promotional noise. Be supportive.',
  },
  {
    id: 'monsoon',
    name: 'Monsoon Season',
    tone: 'cozy, understanding, helpful',
    guidance: 'Weather disruptions common. Be patient about service issues. Warm tone.',
  },
  {
    id: 'wedding_season',
    name: 'Wedding Season',
    tone: 'celebratory, busy, helpful',
    guidance: 'Users planning events. Data/connectivity critical. Be extra helpful.',
  },
] as const;

// =============================================================================
// TIME OF DAY LOGIC
// =============================================================================

/**
 * Tone guidance for each time of day
 */
export interface TimeGuidance {
  timeOfDay: TimeOfDay;
  hours: string;
  tone: string;
  guidance: string;
  restrictions: string[];
}

export const TIME_GUIDANCE: readonly TimeGuidance[] = [
  {
    timeOfDay: 'morning',
    hours: '6am - 12pm',
    tone: 'Energetic, motivating, fresh',
    guidance: 'Good time for promotional content. Users are alert and receptive.',
    restrictions: [],
  },
  {
    timeOfDay: 'afternoon',
    hours: '12pm - 5pm',
    tone: 'Quick, efficient, focused',
    guidance: 'Users are busy. Keep messages brief and action-oriented.',
    restrictions: [],
  },
  {
    timeOfDay: 'evening',
    hours: '5pm - 10pm',
    tone: 'Warm, relaxed, conversational',
    guidance: 'Family time. Tone can be warmer. Good for engagement content.',
    restrictions: [],
  },
  {
    timeOfDay: 'late_night',
    hours: '10pm - 6am',
    tone: 'Calm, minimal, urgent-only',
    guidance: 'Do NOT send promotional content. Only urgent/critical alerts.',
    restrictions: [
      'No promotional messages',
      'No marketing content',
      'Only urgent service alerts',
      'Only security notifications',
      'Only time-sensitive transactions',
    ],
  },
] as const;

/**
 * Day guidance
 */
export interface DayGuidance {
  dayOfWeek: DayOfWeek;
  tone: string;
  guidance: string;
}

export const DAY_GUIDANCE: readonly DayGuidance[] = [
  {
    dayOfWeek: 'weekday',
    tone: 'Efficient, professional, productive',
    guidance: 'Users are in work mode. Be respectful of their time.',
  },
  {
    dayOfWeek: 'weekend',
    tone: 'Playful, relaxed, social',
    guidance: 'Users have more leisure time. Can be more conversational.',
  },
] as const;

// =============================================================================
// TIMING DETECTION
// =============================================================================

/**
 * Get current time of day
 */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'late_night';
}

/**
 * Get current day of week category
 */
export function getDayOfWeek(date: Date = new Date()): DayOfWeek {
  const day = date.getDay();
  return (day === 0 || day === 6) ? 'weekend' : 'weekday';
}

/**
 * Detect if current date is during a festival
 */
export function detectFestival(date: Date = new Date()): Festival | null {
  const month = date.getMonth() + 1; // getMonth is 0-indexed
  const day = date.getDate();
  
  for (const festival of FESTIVALS) {
    if (festival.month === month && day >= festival.dayStart && day <= festival.dayEnd) {
      return festival;
    }
  }
  
  return null;
}

/**
 * Get complete timing context
 */
export function getTimingContext(date: Date = new Date()): TimingContext {
  const festival = detectFestival(date);
  
  return {
    timeOfDay: getTimeOfDay(date),
    dayOfWeek: getDayOfWeek(date),
    festival: festival?.name,
  };
}

/**
 * Get timing guidance for prompt
 */
export function getTimingGuidance(timing: TimingContext): string {
  const timeGuide = TIME_GUIDANCE.find(t => t.timeOfDay === timing.timeOfDay);
  const dayGuide = DAY_GUIDANCE.find(d => d.dayOfWeek === timing.dayOfWeek);
  const festival = timing.festival ? FESTIVALS.find(f => f.name === timing.festival) : null;
  
  let guidance = `
TIME: ${timing.timeOfDay.toUpperCase()} (${timeGuide?.hours})
Tone: ${timeGuide?.tone}
${timeGuide?.guidance}
${timeGuide?.restrictions.length ? `
RESTRICTIONS:
${timeGuide.restrictions.map(r => `- ${r}`).join('\n')}` : ''}

DAY: ${timing.dayOfWeek.toUpperCase()}
Tone: ${dayGuide?.tone}
${dayGuide?.guidance}
`.trim();

  if (festival) {
    guidance += `

FESTIVAL: ${festival.name}
Tone: ${festival.tone}
${festival.inclusive ? 'This is a pan-India celebration.' : 'This is a regional celebration - be mindful of audience.'}
Greeting suggestion: "${festival.greeting}"
`;
  }

  return guidance;
}

/**
 * Check if current time allows promotional content
 */
export function allowsPromotionalContent(timing: TimingContext): boolean {
  return timing.timeOfDay !== 'late_night';
}

/**
 * Check if current time is optimal for engagement
 */
export function isOptimalEngagementTime(timing: TimingContext): boolean {
  return (
    (timing.timeOfDay === 'morning' || timing.timeOfDay === 'evening') &&
    timing.dayOfWeek === 'weekend'
  );
}

export default {
  FESTIVALS,
  SPECIAL_EVENTS,
  TIME_GUIDANCE,
  DAY_GUIDANCE,
  getTimeOfDay,
  getDayOfWeek,
  detectFestival,
  getTimingContext,
  getTimingGuidance,
  allowsPromotionalContent,
  isOptimalEngagementTime,
};
