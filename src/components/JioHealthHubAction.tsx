/**
 * JioHealthHubAction Component
 * 
 * Displays JioHealthHub branded action card when health topics are detected.
 * Follows the pattern from JioSaavnExploration.tsx.
 * 
 * Features:
 * - Auto-detects health topics from message content
 * - Shows branded card with JioHealthHub logo
 * - Two action buttons: "Connect with Doctor" and "Book Appointment"
 * - Opens JioHealthHub URLs via window.open()
 */

import { memo, useCallback, useMemo } from 'react';
import { useThemeColors } from '../theme';
import { detectHealthTopic, getHealthcareMessage } from '../services/healthcare/healthTopicDetector';
import { DSIcon } from './DSIcon';

interface JioHealthHubActionProps {
  messageId: string;
  messageContent: string;
  safetyDomain?: string;
  ecosystem?: string;
}

const JIOHEALTHHUB_TEAL = '#00A896';

const JIOHEALTHHUB_URLS = {
  consult: 'https://www.jio.com/jcms/jiohealthhub/',
  appointments: 'https://www.jio.com/jcms/jiohealthhub/',
};

export const JioHealthHubAction = memo(function JioHealthHubAction({
  messageId,
  messageContent,
  safetyDomain,
  ecosystem,
}: JioHealthHubActionProps) {
  console.log('[JioHealthHubAction] Rendering for message:', messageId, 'content length:', messageContent?.length);
  
  const theme = useThemeColors();
  
  const healthTopic = useMemo(() => {
    return detectHealthTopic(messageContent, safetyDomain, ecosystem);
  }, [messageContent, safetyDomain, ecosystem]);
  
  const handleConnectDoctor = useCallback(() => {
    console.log('[JioHealthHubAction] Opening doctor consultation');
    window.open(JIOHEALTHHUB_URLS.consult, '_blank', 'noopener,noreferrer');
  }, []);
  
  const handleBookAppointment = useCallback(() => {
    console.log('[JioHealthHubAction] Opening appointment booking');
    window.open(JIOHEALTHHUB_URLS.appointments, '_blank', 'noopener,noreferrer');
  }, []);
  
  if (!healthTopic.detected) {
    console.log('[JioHealthHubAction] Health topic not detected, returning null');
    return null;
  }
  
  console.log('[JioHealthHubAction] Rendering action card', {
    category: healthTopic.category,
    confidence: healthTopic.confidence,
    keywords: healthTopic.matchedKeywords,
  });
  
  const contextMessage = getHealthcareMessage(healthTopic.category);
  
  return (
    <div
      className="mt-4 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: theme.background.subtle,
      }}
    >
      {/* Header with JioHealthHub branding */}
      <div
        className="flex items-center gap-2"
        style={{
          paddingTop: '12px',
          paddingBottom: '12px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: JIOHEALTHHUB_TEAL,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13 3h-2v8H3v2h8v8h2v-8h8v-2h-8V3z"
              fill="white"
            />
          </svg>
        </div>
        <span
          style={{
            color: theme.text.high,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          JioHealthHub
        </span>
      </div>
      
      {/* Contextual message */}
      {contextMessage && (
        <div
          style={{
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingBottom: '12px',
          }}
        >
          <p
            style={{
              color: theme.text.medium,
              fontSize: '14px',
              lineHeight: '1.4',
            }}
          >
            {contextMessage}
          </p>
        </div>
      )}
      
      {/* Action buttons */}
      <div
        className="flex gap-3"
        style={{
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
        }}
      >
        {/* Primary: Connect with Doctor */}
        <button
          onClick={handleConnectDoctor}
          className="flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-colors duration-150"
          style={{
            backgroundColor: JIOHEALTHHUB_TEAL,
            color: 'white',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          connect with doctor
        </button>
        
        {/* Secondary: Book Appointment */}
        <button
          onClick={handleBookAppointment}
          className="flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-colors duration-150"
          style={{
            backgroundColor: theme.stroke.low,
            color: theme.text.high,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.stroke.medium;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.stroke.low;
          }}
        >
          book appointment
        </button>
      </div>
    </div>
  );
});

export default JioHealthHubAction;
