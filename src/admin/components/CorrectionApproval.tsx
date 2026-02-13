import { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useThemeColors } from '../../theme/useColors';
import { AdminTable, AdminTableRow, AdminTableCell } from './AdminTable';
import { formatRelativeTime } from '../utils/formatters';
import type { Id } from '../../../convex/_generated/dataModel';

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
  const colorMap: Record<string, { bg: string; fg: string }> = {
    thumbs_up: { bg: 'rgba(34,197,94,0.12)', fg: '#22c55e' },
    thumbs_down: { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444' },
    edit: { bg: 'rgba(59,130,246,0.12)', fg: '#3b82f6' },
    comment: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
  };
  const c = colorMap[type] || { bg: 'rgba(107,114,128,0.12)', fg: '#6b7280' };
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
  const colorMap: Record<string, { bg: string; fg: string }> = {
    approved: { bg: 'rgba(34,197,94,0.12)', fg: '#22c55e' },
    rejected: { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444' },
    pending: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
  };
  const c = colorMap[status] || colorMap.pending;
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
            correction detail
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
            original content (ai generated)
          </label>
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
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
              user edited content
            </label>
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(34,197,94,0.08)',
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
              user reported issues
            </label>
            <div className="flex flex-wrap gap-2">
              {correction.reasons.map((reason, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md px-2 py-1"
                  style={{
                    fontSize: '12px',
                    backgroundColor: 'rgba(239,68,68,0.12)',
                    color: '#ef4444',
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
              user comment
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
          <strong>approve:</strong> this correction will be used to improve future content generation. 
          the system learns from user edits and preferences.
          <br />
          <strong>reject:</strong> this correction will be excluded from learning. 
          use this if the feedback is incorrect, spam, or not helpful.
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
            close
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
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isUpdating ? 'updating...' : 'reject'}
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
                backgroundColor: '#22c55e',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isUpdating ? 'updating...' : 'approve'}
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
}

export function CorrectionApprovalList({ deviceId }: CorrectionApprovalListProps) {
  const theme = useThemeColors();
  const [filter, setFilter] = useState<string>('all');
  const [selectedCorrection, setSelectedCorrection] = useState<Correction | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Fetch corrections
  const corrections = useQuery(api.corrections.listAll, { 
    limit: 100,
    adminStatus: filter !== 'all' ? filter : undefined,
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

  // Filter tabs
  const filterTabs = [
    { key: 'all', label: 'all' },
    { key: 'approved', label: 'approved' },
    { key: 'rejected', label: 'rejected' },
  ];

  // Cast corrections to typed array
  const typedCorrections = (corrections || []) as Correction[];

  return (
    <>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: filter === tab.key ? theme.accent : theme.stroke.low,
              color: filter === tab.key ? '#fff' : theme.text.medium,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
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
        isEmpty={typedCorrections.length === 0}
        emptyMessage="no corrections to review"
      >
        {typedCorrections.map((c) => (
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
                review
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
