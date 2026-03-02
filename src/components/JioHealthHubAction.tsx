/**
 * JioHealthHubAction Component
 * 
 * Displays JioHealthHub branded action card when health topics are detected.
 * Follows the pattern from JioSaavnExploration.tsx.
 * 
 * Features:
 * - Auto-detects health topics from message content
 * - Shows branded card with JioHealthHub logo
 * - Single action button: "Find Doctors Nearby"
 * - Emergency disclaimer for severe symptoms
 * - Opens JioHealthHub URLs via window.open()
 */

import { memo, useCallback, useMemo } from 'react';
import { Button } from '@marcelinodzn/ds-react';
import { useThemeColors } from '../theme';
import { detectHealthTopic, getHealthcareMessage } from '../services/healthcare/healthTopicDetector';

interface JioHealthHubActionProps {
  messageId: string;
  messageContent: string;
  safetyDomain?: string;
  ecosystem?: string;
}

const JIOHEALTHHUB_URL = 'https://www.jio.com/jcms/jiohealthhub/';

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
  
  const handleFindDoctors = useCallback(() => {
    console.log('[JioHealthHubAction] Opening JioHealthHub to find doctors');
    window.open(JIOHEALTHHUB_URL, '_blank', 'noopener,noreferrer');
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
        <img
          src="/jiohealthhub-logo.png"
          alt="JioHealthHub"
          className="w-5 h-5 rounded-full"
        />
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
      
      {/* Action button - DS Button primary with high attention, hug style */}
      <div
        style={{
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '12px',
        }}
      >
        <Button
          appearance="primary"
          attention="high"
          size="S"
          onPress={handleFindDoctors}
        >
          Find doctors nearby
        </Button>
      </div>
      
      {/* Emergency disclaimer */}
      <div
        style={{
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
        }}
      >
        <p
          style={{
            color: theme.text.low,
            fontSize: '12px',
            lineHeight: '1.4',
          }}
        >
          If symptoms are severe, call emergency services at 112.
        </p>
      </div>
    </div>
  );
});

export default JioHealthHubAction;
