import { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useThemeColors, SEMANTIC_COLORS } from '../../theme/useColors';
import { AdminTable, AdminTableRow, AdminTableCell } from './AdminTable';
import { formatRelativeTime } from '../utils/formatters';
import type { Id } from '../../../convex/_generated/dataModel';
import { Chip, Divider } from '@marcelinodzn/ds-react';

/** Semantic color map for feedback types */
const FEEDBACK_COLORS: Record<string, { bg: string; fg: string }> = {
  thumbs_up:   { bg: `${SEMANTIC_COLORS.positive}1F`, fg: SEMANTIC_COLORS.positive },
  thumbs_down: { bg: `${SEMANTIC_COLORS.negative}1F`, fg: SEMANTIC_COLORS.negative },
  edit:        { bg: `${SEMANTIC_COLORS.informative}1F`, fg: SEMANTIC_COLORS.informative },
  comment:     { bg: `${SEMANTIC_COLORS.warning}1F`, fg: SEMANTIC_COLORS.warning },
};
const FEEDBACK_FALLBACK = { bg: 'rgba(107,114,128,0.12)', fg: '#6b7280' };

/** Semantic color map for admin statuses */
const STATUS_MAP: Record<string, { bg: string; fg: string }> = {
  approved: { bg: `${SEMANTIC_COLORS.positive}1F`, fg: SEMANTIC_COLORS.positive },
  rejected: { bg: `${SEMANTIC_COLORS.negative}1F`, fg: SEMANTIC_COLORS.negative },
  pending:  { bg: `${SEMANTIC_COLORS.warning}1F`, fg: SEMANTIC_COLORS.warning },
};

// ── Types ────────────────────────────────────────────────────────
interface Correction {
  _id: Id<"corrections">;
  feedbackType: string;
  originalContent: string;
  editedContent?: string;
  comment?: string;
  reasons?: string[];
  ecosystem: string;
  channel: string;
  adminStatus: string;
  timestamp: number;
}

// ── Feedback Type Badge ─────────────────────────────────────────
function FeedbackBadge({ type }: { type: string }) {
  const c = FEEDBACK_COLORS[type] || FEEDBACK_FALLBACK;
  return (
    <span
      className="inline-block rounded-full font-medium whitespace-nowrap"
      style={{
        fontSize: '11px',
        padding: '1px 8px',
        backgroundColor: c.bg,
        color: c.fg,
      }}
    >
      {type.replace('_', ' ')}
    </span>
  );
}

// ── Status Badge ────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span
      className="inline-block rounded-full font-medium whitespace-nowrap"
      style={{
        fontSize: '11px',
        padding: '1px 8px',
        backgroundColor: c.bg,
        color: c.fg,
      }}
    >
      {status}
    </span>
  );
}

// ── Correction Detail Modal ─────────────────────────────────────
interface CorrectionDetailProps {
  correction: Correction;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isUpdating: boolean;
}

function CorrectionDetailModal({ 
  correction, 
  onClose, 
  onApprove, 
  onReject,
  isUpdating,
}: CorrectionDetailProps) {
  const theme = useThemeColors();
  
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl p-6"
        style={{
          backgroundColor: theme.background.subtle,
          border: `1px solid ${theme.stroke.low}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 
            className="font-semibold"
            style={{ color: theme.text.high, fontSize: '16px' }}
          >
            Correction detail
          </h3>
          <div className="flex gap-2">
            <FeedbackBadge type={correction.feedbackType} />
            <StatusBadge status={correction.adminStatus} />
          </div>
        </div>

        {/* Metadata */}
        <div className="flex gap-4 mb-4 text-xs" style={{ color: theme.text.low }}>
          <span>ecosystem: {correction.ecosystem}</span>
          <span>channel: {correction.channel}</span>
          <span>{formatRelativeTime(correction.timestamp)}</span>
        </div>

        {/* Original Content */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
            Original content (AI generated)
          </label>
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              backgroundColor: `${SEMANTIC_COLORS.negative}14`,
              color: theme.text.high,
              border: `1px solid ${theme.stroke.low}`,
            }}
          >
            {correction.originalContent}
          </div>
        </div>

        {/* Edited Content (for edit type) */}
        {correction.feedbackType === 'edit' && correction.editedContent && (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
              User edited content
            </label>
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                backgroundColor: `${SEMANTIC_COLORS.positive}14`,
                color: theme.text.high,
                border: `1px solid ${theme.stroke.low}`,
              }}
            >
              {correction.editedContent}
            </div>
          </div>
        )}

        {/* Reasons (for thumbs_down) */}
        {correction.feedbackType === 'thumbs_down' && correction.reasons && correction.reasons.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
              User reported issues
            </label>
            <div className="flex flex-wrap gap-2">
              {correction.reasons.map((reason, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md px-2 py-1"
                  style={{
                    fontSize: '12px',
                    backgroundColor: `${SEMANTIC_COLORS.negative}1F`,
                    color: SEMANTIC_COLORS.negative,
                  }}
                >
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        {correction.comment && (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
              User comment
            </label>
            <div
              className="p-3 rounded-lg text-sm italic"
              style={{
                backgroundColor: theme.background.ghost,
                color: theme.text.medium,
                border: `1px solid ${theme.stroke.low}`,
              }}
            >
              "{correction.comment}"
            </div>
          </div>
        )}

        {/* Explanation */}
        <div 
          className="p-3 rounded-lg mb-4 text-xs"
          style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
        >
          <strong>Approve:</strong> This correction will be used to improve future content generation. 
          The system learns from user edits and preferences.
          <br />
          <strong>Reject:</strong> This correction will be excluded from learning. 
          Use this if the feedback is incorrect, spam, or not helpful.
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg font-medium transition-opacity hover:opacity-80"
            style={{
              height: '36px',
              fontSize: '13px',
              backgroundColor: theme.stroke.low,
              color: theme.text.high,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          
          {correction.adminStatus !== 'rejected' && (
            <button
              type="button"
              onClick={onReject}
              disabled={isUpdating}
              className="flex-1 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                height: '36px',
                fontSize: '13px',
                backgroundColor: SEMANTIC_COLORS.negative,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isUpdating ? 'Updating...' : 'Reject'}
            </button>
          )}
          
          {correction.adminStatus !== 'approved' && (
            <button
              type="button"
              onClick={onApprove}
              disabled={isUpdating}
              className="flex-1 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                height: '36px',
                fontSize: '13px',
                backgroundColor: SEMANTIC_COLORS.positive,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isUpdating ? 'Updating...' : 'Approve'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Correction Approval List ────────────────────────────────
interface CorrectionApprovalListProps {
  deviceId?: string;
  feedbackCounts?: Record<string, number>;
}

export function CorrectionApprovalList({ deviceId, feedbackCounts }: CorrectionApprovalListProps) {
  const theme = useThemeColors();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedCorrection, setSelectedCorrection] = useState<Correction | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Fetch corrections (filtered by adminStatus via API)
  const corrections = useQuery(api.corrections.listAll, { 
    limit: 100,
    adminStatus: statusFilter !== 'all' ? statusFilter : undefined,
  });
  
  // Update mutation
  const updateStatus = useMutation(api.corrections.updateAdminStatus);

  const handleApprove = useCallback(async () => {
    if (!selectedCorrection) return;
    setIsUpdating(true);
    try {
      await updateStatus({
        correctionId: selectedCorrection._id,
        adminStatus: 'approved',
        updatedBy: deviceId,
      });
      setSelectedCorrection(null);
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [selectedCorrection, updateStatus, deviceId]);

  const handleReject = useCallback(async () => {
    if (!selectedCorrection) return;
    setIsUpdating(true);
    try {
      await updateStatus({
        correctionId: selectedCorrection._id,
        adminStatus: 'rejected',
        updatedBy: deviceId,
      });
      setSelectedCorrection(null);
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [selectedCorrection, updateStatus, deviceId]);

  // Loading state
  if (corrections === undefined) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 rounded w-1/4" style={{ backgroundColor: theme.stroke.low }} />
        <div className="h-20 rounded" style={{ backgroundColor: theme.stroke.low }} />
      </div>
    );
  }

  // Status filter tabs
  const statusTabs = [
    { key: 'all', label: 'all' },
    { key: 'approved', label: 'approved' },
    { key: 'rejected', label: 'rejected' },
  ];

  // Cast corrections to typed array
  const typedCorrections = (corrections || []) as Correction[];
  
  // Apply feedbackType filter client-side
  const filteredCorrections = typeFilter === 'all' 
    ? typedCorrections 
    : typedCorrections.filter(c => c.feedbackType === typeFilter);

  return (
    <>
      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        {/* Status filters */}
        {statusTabs.map(tab => (
          <Chip
            key={tab.key}
            size="S"
            appearance="neutral"
            isSelected={statusFilter === tab.key}
            onPress={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </Chip>
        ))}
        
        {/* Visual separator */}
        <Divider orientation="vertical" />
        
        {/* Feedback type filters - functional */}
        {['thumbs_up', 'thumbs_down', 'edit', 'comment'].map(type => (
          <Chip
            key={type}
            size="S"
            appearance="neutral"
            isSelected={typeFilter === type}
            onPress={() => setTypeFilter(typeFilter === type ? 'all' : type)}
          >
            {feedbackCounts?.[type] ?? 0} {type.replace('_', ' ')}
          </Chip>
        ))}
      </div>

      {/* Corrections Table */}
      <AdminTable
        columns={[
          { key: 'type', label: 'type' },
          { key: 'content', label: 'content' },
          { key: 'context', label: 'context' },
          { key: 'status', label: 'status' },
          { key: 'time', label: 'time' },
          { key: 'action', label: '' },
        ]}
        isEmpty={filteredCorrections.length === 0}
        emptyMessage="No corrections to review"
      >
        {filteredCorrections.map((c) => (
          <AdminTableRow key={c._id.toString()}>
            <AdminTableCell>
              <FeedbackBadge type={c.feedbackType} />
            </AdminTableCell>
            <AdminTableCell className="max-w-[250px] truncate">
              {c.originalContent.slice(0, 80)}
              {c.originalContent.length > 80 ? '...' : ''}
            </AdminTableCell>
            <AdminTableCell>
              <span className="text-xs" style={{ color: theme.text.low }}>
                {c.ecosystem} / {c.channel}
              </span>
            </AdminTableCell>
            <AdminTableCell>
              <StatusBadge status={c.adminStatus} />
            </AdminTableCell>
            <AdminTableCell>
              <span className="text-xs" style={{ color: theme.text.low }}>
                {formatRelativeTime(c.timestamp)}
              </span>
            </AdminTableCell>
            <AdminTableCell>
              <button
                onClick={() => setSelectedCorrection(c)}
                className="px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: theme.accent,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Review
              </button>
            </AdminTableCell>
          </AdminTableRow>
        ))}
      </AdminTable>

      {/* Detail Modal */}
      {selectedCorrection && (
        <CorrectionDetailModal
          correction={selectedCorrection}
          onClose={() => setSelectedCorrection(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          isUpdating={isUpdating}
        />
      )}
    </>
  );
}

export default CorrectionApprovalList;
