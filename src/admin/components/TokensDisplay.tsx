/**
 * Tokens v2 Display Component
 * 
 * Displays all 50+ tokens from the Tokens v2 specification with:
 * - Grouped by category (Routing, Safety, Nudge, User, Context, Emotion, etc.)
 * - Collapsible sections
 * - Search/filter functionality
 * - Token documentation
 */

import { useState, useMemo, memo } from 'react';
import { useThemeColors } from '../../theme/useColors';
import { DSIcon } from '../../components/DSIcon';
import { 
  TOKEN_GROUPS, 
  TOKEN_COUNTS, 
  TOTAL_TOKEN_COUNT 
} from '../../services/tokens/tokenTypes';
import { TOKEN_RULES } from '../../services/tokens/tokenRules';

// ═══════════════════════════════════════════════════════════════════════════════
// Token Documentation - Comprehensive descriptions for each token
// ═══════════════════════════════════════════════════════════════════════════════

const TOKEN_DOCUMENTATION: Record<string, {
  description: string;
  values: Array<{ value: string; description: string }>;
  example?: string;
}> = {
  // ROUTING TOKENS
  'route.mode': {
    description: 'Determines which engine leads the response generation',
    values: [
      { value: 'jio_task', description: 'Enter structured Jio resolution flow. Jio service logic dominates.' },
      { value: 'open_chat', description: 'Base LLM answers; Jio layer shapes tone only.' },
      { value: 'mixed', description: 'Blend: LLM + Jio context, weave in relevant offers if helpful.' },
    ],
    example: 'User asks about Jio plan → route.mode: jio_task',
  },
  'route.confidence': {
    description: 'How certain the router is about the classification decision',
    values: [
      { value: 'low', description: 'Uncertain classification, may need clarification' },
      { value: 'medium', description: 'Reasonable confidence in routing decision' },
      { value: 'high', description: 'Very confident in the routing decision' },
    ],
  },
  'route.trigger': {
    description: 'The reason why a particular routing decision was made',
    values: [
      { value: 'explicit_jio_entity', description: 'User mentioned a Jio service/product explicitly' },
      { value: 'implicit_jio_context', description: 'Context implies Jio-related query' },
      { value: 'account_action_request', description: 'User wants to perform an account action' },
      { value: 'general_question', description: 'General knowledge question' },
      { value: 'safety_sensitive', description: 'Query contains safety-sensitive content' },
      { value: 'ambiguous', description: 'Intent is unclear' },
    ],
  },

  // SAFETY TOKENS
  'safety.domain': {
    description: 'Identifies sensitive domains requiring special handling (24 domains)',
    values: [
      { value: 'none', description: 'No sensitive domain detected' },
      { value: 'health_general', description: 'General health questions' },
      { value: 'health_emergency', description: 'Emergency health situation' },
      { value: 'mental_health', description: 'Mental health topics' },
      { value: 'finance_general', description: 'General financial questions' },
      { value: 'investment_advice', description: 'Investment-related queries' },
      { value: 'legal_general', description: 'General legal questions' },
      { value: 'legal_advice', description: 'Specific legal advice requests' },
      { value: 'self_harm', description: 'Self-harm related content' },
      { value: 'suicide_risk', description: 'Suicide risk indicators' },
      { value: 'violence', description: 'Violence-related content' },
      { value: 'hate_harassment', description: 'Hate speech or harassment' },
      { value: 'fraud_scam', description: 'Fraud or scam detection' },
    ],
  },
  'safety.level': {
    description: 'The required safety level for the response',
    values: [
      { value: 'normal', description: 'Standard safety measures' },
      { value: 'elevated', description: 'Enhanced caution required' },
      { value: 'high', description: 'High safety measures active' },
      { value: 'critical', description: 'Critical safety protocols engaged' },
    ],
  },
  'safety.advisory_boundary': {
    description: 'Boundary for advisory content',
    values: [
      { value: 'none', description: 'No advisory needed' },
      { value: 'soft_disclaimer', description: 'Light disclaimer sufficient' },
      { value: 'explicit_disclaimer', description: 'Clear disclaimer required' },
      { value: 'refuse_advise', description: 'Cannot provide advice on this topic' },
    ],
  },

  // EMOTION TOKENS
  'emotion.detected': {
    description: 'Current emotional state using Navarasa framework',
    values: [
      { value: 'shringara', description: 'Love, beauty, devotion - warmth and connection' },
      { value: 'hasya', description: 'Humor, joy - lightness and playfulness' },
      { value: 'karuna', description: 'Compassion, sadness - empathy and care' },
      { value: 'raudra', description: 'Anger, frustration - acknowledgment needed' },
      { value: 'veera', description: 'Courage, confidence - empowerment' },
      { value: 'bhayanaka', description: 'Fear, anxiety - reassurance needed' },
      { value: 'bibhatsa', description: 'Disgust, aversion - validation' },
      { value: 'adbhuta', description: 'Wonder, amazement - celebration' },
      { value: 'shanta', description: 'Peace, calm - the target state' },
    ],
  },
  'emotion.intensity': {
    description: 'Intensity of detected emotion (1-10 scale)',
    values: [
      { value: '1-3', description: 'Low intensity - subtle emotional indicators' },
      { value: '4-6', description: 'Moderate intensity - clear emotional state' },
      { value: '7-8', description: 'High intensity - strong emotional response' },
      { value: '9-10', description: 'Extreme intensity - requires immediate attention' },
    ],
  },
  'emotion.target': {
    description: 'The emotional state to guide user toward',
    values: [
      { value: 'maintain', description: 'Keep current positive state' },
      { value: 'shanta', description: 'Guide toward peaceful state' },
      { value: 'veera', description: 'Build confidence and empowerment' },
      { value: 'hasya', description: 'Introduce appropriate lightness' },
    ],
  },

  // CONVERSATION TOKENS
  'conv.state': {
    description: 'Current state in the conversation flow',
    values: [
      { value: 'greeting', description: 'Initial greeting phase' },
      { value: 'understanding', description: 'Gathering information' },
      { value: 'resolving', description: 'Working on resolution' },
      { value: 'confirming', description: 'Verifying solution' },
      { value: 'closing', description: 'Wrapping up conversation' },
      { value: 'escalated', description: 'Transferred to human agent' },
    ],
  },
  'conv.turn_count': {
    description: 'Number of turns in the conversation',
    values: [
      { value: '1-2', description: 'Early turns - build rapport' },
      { value: '3-5', description: 'Active resolution - stay focused' },
      { value: '6-8', description: 'Extended conversation - check satisfaction' },
      { value: '9+', description: 'Long conversation - consider escalation' },
    ],
  },
  'conv.resolution_status': {
    description: 'Current resolution status',
    values: [
      { value: 'not_started', description: 'Issue not yet addressed' },
      { value: 'in_progress', description: 'Actively working on resolution' },
      { value: 'resolved', description: 'Issue successfully resolved' },
      { value: 'escalated', description: 'Handed off to human' },
      { value: 'abandoned', description: 'User left conversation' },
    ],
  },

  // IDENTITY TOKENS
  'identity.persona': {
    description: 'The AI persona being used',
    values: [
      { value: 'jio_voice', description: 'Default Jio conversational assistant' },
      { value: 'jio_support', description: 'Technical support specialist' },
      { value: 'jio_sales', description: 'Sales and offers specialist' },
    ],
  },
  'identity.ecosystem': {
    description: 'Jio ecosystem context',
    values: [
      { value: 'jio_telecom', description: 'Mobile and telecom services' },
      { value: 'jio_fiber', description: 'Broadband and fiber services' },
      { value: 'jio_platforms', description: 'Digital platforms (JioTV, JioCinema, etc.)' },
      { value: 'jio_retail', description: 'JioMart and retail services' },
      { value: 'jio_money', description: 'Financial services' },
    ],
  },
  'identity.channel': {
    description: 'Communication channel',
    values: [
      { value: 'chatbot', description: 'Chat interface' },
      { value: 'sms', description: 'SMS messages' },
      { value: 'ivr', description: 'Voice response system' },
      { value: 'email', description: 'Email communication' },
      { value: 'whatsapp', description: 'WhatsApp messaging' },
      { value: 'push_notification', description: 'Push notifications' },
    ],
  },

  // PATTERN TOKENS
  'pattern.sequence': {
    description: 'Response pattern to follow',
    values: [
      { value: 'acknowledge_clarify_act_verify', description: 'Standard support flow' },
      { value: 'acknowledge_act_summarise', description: 'Quick resolution flow' },
      { value: 'acknowledge_redirect', description: 'Redirect to appropriate channel' },
      { value: 'empathise_reassure_guide', description: 'Emotional support flow' },
      { value: 'clarify_only', description: 'Need more information' },
      { value: 'escalate_warmly', description: 'Warm handoff to human' },
    ],
  },

  // RISK TOKENS
  'risk.category': {
    description: 'Type of operational risk detected',
    values: [
      { value: 'none', description: 'No risk detected' },
      { value: 'account_security', description: 'Account security concern' },
      { value: 'finance_regulatory', description: 'Financial regulation concern' },
      { value: 'fraud_scam', description: 'Fraud or scam attempt' },
      { value: 'data_privacy', description: 'Data privacy concern' },
      { value: 'legal_liability', description: 'Legal liability risk' },
      { value: 'reputation', description: 'Brand reputation risk' },
      { value: 'compliance', description: 'Compliance violation risk' },
    ],
  },
  'risk.level': {
    description: 'Risk severity level',
    values: [
      { value: 'low', description: 'Minimal risk - proceed normally' },
      { value: 'medium', description: 'Moderate risk - add caution' },
      { value: 'high', description: 'High risk - require confirmation' },
      { value: 'critical', description: 'Critical risk - block or escalate' },
    ],
  },

  // FINISHING TOKENS
  'finish.signature': {
    description: 'Closing signature style',
    values: [
      { value: 'youre_all_set', description: 'Task completed successfully' },
      { value: 'thank_you', description: 'General interaction closure' },
      { value: 'with_love', description: 'Celebration or delight context' },
      { value: 'take_care', description: 'Health or sensitive context' },
      { value: 'reach_out_anytime', description: 'Support context - availability' },
      { value: 'none', description: 'No signature (brief responses)' },
    ],
  },
  'finish.small_joy': {
    description: 'Micro-uplift element to include',
    values: [
      { value: 'none', description: 'No joy element appropriate' },
      { value: 'encouragement', description: 'Encouraging message' },
      { value: 'celebration', description: 'Celebrating achievement' },
      { value: 'cricket_reference', description: 'Cricket-related joy (match context)' },
      { value: 'festival_warmth', description: 'Festival-related warmth' },
    ],
  },

  // MEMORY TOKENS
  'memory.session.last_intent': {
    description: 'Most recent user intent in session',
    values: [
      { value: '(dynamic)', description: 'Populated from session memory' },
    ],
  },
  'memory.session.last_step': {
    description: 'Last action step completed',
    values: [
      { value: '(dynamic)', description: 'Populated from session memory' },
    ],
  },
  'memory.session.last_entity': {
    description: 'Key entity from last turn',
    values: [
      { value: '(dynamic)', description: 'Populated from session memory' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

interface TokenCardProps {
  tokenKey: string;
  doc: typeof TOKEN_DOCUMENTATION[string];
  rules: Record<string, string> | undefined;
}

const TokenCard = memo(function TokenCard({ tokenKey, doc, rules }: TokenCardProps) {
  const theme = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="rounded-lg p-3 mb-2"
      style={{
        backgroundColor: theme.background.layer,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <code
            className="px-2 py-0.5 rounded text-sm font-mono"
            style={{
              backgroundColor: theme.stroke.low,
              color: theme.accent.primary,
            }}
          >
            {tokenKey}
          </code>
          <span
            className="text-xs"
            style={{ color: theme.text.low }}
          >
            {doc.values.length} values
          </span>
        </div>
        <DSIcon
          name={isExpanded ? 'IcChevronUp' : 'IcChevronDown'}
          size="XS"
          attention="low"
        />
      </button>

      {/* Description */}
      <p
        className="text-sm mt-2"
        style={{ color: theme.text.medium }}
      >
        {doc.description}
      </p>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {/* Values */}
          <div>
            <h4
              className="text-xs font-medium mb-1"
              style={{ color: theme.text.low }}
            >
              possible values
            </h4>
            <div className="space-y-1">
              {doc.values.map((v) => (
                <div
                  key={v.value}
                  className="flex items-start gap-2 text-sm"
                >
                  <code
                    className="px-1.5 py-0.5 rounded text-xs font-mono shrink-0"
                    style={{
                      backgroundColor: theme.background.ghost,
                      color: theme.text.high,
                    }}
                  >
                    {v.value}
                  </code>
                  <span style={{ color: theme.text.medium }}>
                    {v.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          {rules && Object.keys(rules).length > 0 && (
            <div>
              <h4
                className="text-xs font-medium mb-1 mt-3"
                style={{ color: theme.text.low }}
              >
                llm behavior rules
              </h4>
              <div className="space-y-1">
                {Object.entries(rules).map(([value, rule]) => (
                  <div
                    key={value}
                    className="text-xs p-2 rounded"
                    style={{
                      backgroundColor: theme.background.ghost,
                      border: `1px solid ${theme.stroke.low}`,
                    }}
                  >
                    <code
                      className="font-mono"
                      style={{ color: theme.accent.primary }}
                    >
                      {value}
                    </code>
                    <span style={{ color: theme.text.low }}> → </span>
                    <span style={{ color: theme.text.medium }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Example */}
          {doc.example && (
            <div
              className="text-xs mt-2 p-2 rounded"
              style={{
                backgroundColor: theme.accent.primary + '10',
                color: theme.text.medium,
              }}
            >
              <strong>Example:</strong> {doc.example}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

interface TokenGroupProps {
  groupName: string;
  tokens: string[];
  tokenDocs: typeof TOKEN_DOCUMENTATION;
  tokenRules: typeof TOKEN_RULES;
}

const TokenGroup = memo(function TokenGroup({ 
  groupName, 
  tokens, 
  tokenDocs, 
  tokenRules 
}: TokenGroupProps) {
  const theme = useThemeColors();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const displayName = groupName.replace(/_/g, ' ').toLowerCase();

  return (
    <div className="mb-4">
      {/* Group Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer mb-2"
        style={{
          backgroundColor: theme.stroke.low,
        }}
      >
        <div className="flex items-center gap-2">
          <DSIcon
            name={isCollapsed ? 'IcChevronRight' : 'IcChevronDown'}
            size="XS"
            attention="medium"
          />
          <span
            className="text-sm font-medium"
            style={{ color: theme.text.high }}
          >
            {displayName}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: theme.accent.primary + '20',
              color: theme.accent.primary,
            }}
          >
            {tokens.length} tokens
          </span>
        </div>
      </button>

      {/* Tokens */}
      {!isCollapsed && (
        <div className="pl-4">
          {tokens.map((tokenKey) => {
            const doc = tokenDocs[tokenKey] || {
              description: `Token: ${tokenKey}`,
              values: [],
            };
            const rules = tokenRules[tokenKey];

            return (
              <TokenCard
                key={tokenKey}
                tokenKey={tokenKey}
                doc={doc}
                rules={rules}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export const TokensDisplay = memo(function TokensDisplay() {
  const theme = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | 'all'>('all');

  // Filter tokens based on search and group selection
  const filteredGroups = useMemo(() => {
    const groups = Object.entries(TOKEN_GROUPS);
    
    if (selectedGroup !== 'all') {
      return groups.filter(([name]) => name === selectedGroup);
    }
    
    if (!searchQuery) {
      return groups;
    }
    
    const query = searchQuery.toLowerCase();
    return groups
      .map(([name, tokens]) => {
        const filteredTokens = tokens.filter((token) => {
          const doc = TOKEN_DOCUMENTATION[token];
          return (
            token.toLowerCase().includes(query) ||
            (doc && doc.description.toLowerCase().includes(query)) ||
            (doc && doc.values.some((v) => 
              v.value.toLowerCase().includes(query) || 
              v.description.toLowerCase().includes(query)
            ))
          );
        });
        return [name, filteredTokens] as [string, string[]];
      })
      .filter(([, tokens]) => tokens.length > 0);
  }, [searchQuery, selectedGroup]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: theme.stroke.low }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ color: theme.text.high }}
            >
              tokens v2 specification
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: theme.text.low }}
            >
              {TOTAL_TOKEN_COUNT} tokens across {Object.keys(TOKEN_GROUPS).length} categories
            </p>
          </div>
          <div
            className="text-right text-sm"
            style={{ color: theme.text.low }}
          >
            <div>controls LLM behavior</div>
            <div>routing, safety, emotion, identity</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <DSIcon
              name="IcSearch"
              size="XS"
              attention="low"
              className="absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: theme.background.layer,
                border: `1px solid ${theme.stroke.low}`,
                color: theme.text.high,
              }}
            />
          </div>

          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm cursor-pointer"
            style={{
              backgroundColor: theme.background.layer,
              border: `1px solid ${theme.stroke.low}`,
              color: theme.text.high,
            }}
          >
            <option value="all">all groups ({TOTAL_TOKEN_COUNT})</option>
            {Object.entries(TOKEN_COUNTS).map(([group, count]) => (
              <option key={group} value={group}>
                {group.replace(/_/g, ' ').toLowerCase()} ({count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredGroups.length === 0 ? (
          <div
            className="text-center py-8"
            style={{ color: theme.text.low }}
          >
            no tokens found matching "{searchQuery}"
          </div>
        ) : (
          filteredGroups.map(([groupName, tokens]) => (
            <TokenGroup
              key={groupName}
              groupName={groupName}
              tokens={tokens}
              tokenDocs={TOKEN_DOCUMENTATION}
              tokenRules={TOKEN_RULES}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default TokensDisplay;
