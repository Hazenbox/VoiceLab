import { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useThemeColors, SEMANTIC_COLORS } from '../../theme/useColors';
import type { Id } from '../../../convex/_generated/dataModel';

// ── Types ────────────────────────────────────────────────────────
interface KnowledgeItem {
  _id?: Id<"knowledgeItems">;
  type: string;
  category: string;
  content: string;
  metadata: {
    ecosystem?: string;
    channel?: string;
    persona?: string;
    severity?: string;
    suggestion?: string;
    source?: string;
  };
  tags: string[];
  isActive: boolean;
}

interface KnowledgeCRUDProps {
  selectedType: string;
  onClose: () => void;
  existingItem?: KnowledgeItem;
  deviceId?: string;
}

// ── Knowledge Item Editor Form ────────────────────────────────────
export function KnowledgeItemEditor({ 
  selectedType, 
  onClose, 
  existingItem,
  deviceId,
}: KnowledgeCRUDProps) {
  const theme = useThemeColors();
  const createItem = useMutation(api.knowledge.createItem);
  const updateItem = useMutation(api.knowledge.updateItem);
  
  const isEditing = !!existingItem?._id;
  
  const [formData, setFormData] = useState<Omit<KnowledgeItem, '_id'>>({
    type: existingItem?.type || selectedType,
    category: existingItem?.category || selectedType,
    content: existingItem?.content || '',
    metadata: existingItem?.metadata || {},
    tags: existingItem?.tags || [selectedType],
    isActive: existingItem?.isActive ?? true,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (isEditing && existingItem?._id) {
        await updateItem({
          id: existingItem._id,
          content: formData.content,
          category: formData.category,
          metadata: formData.metadata,
          tags: formData.tags,
          isActive: formData.isActive,
          updatedBy: deviceId,
        });
      } else {
        await createItem({
          ...formData,
          createdBy: deviceId,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isEditing, existingItem, createItem, updateItem, deviceId, onClose]);

  const handleChange = (field: keyof typeof formData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMetadataChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: { ...prev.metadata, [field]: value || undefined },
    }));
  };

  // Render form based on type
  const renderTypeSpecificFields = () => {
    switch (selectedType) {
      case 'avoid_word':
        return (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                Word to avoid *
              </label>
              <input
                type="text"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="e.g., incentivize"
                required
                className="w-full rounded-lg px-3 outline-none"
                style={{
                  height: '36px',
                  fontSize: '13px',
                  backgroundColor: theme.background.ghost,
                  color: theme.text.high,
                  border: `1px solid ${theme.stroke.medium}`,
                }}
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                Severity
              </label>
              <select
                value={formData.metadata.severity || 'warning'}
                onChange={(e) => handleMetadataChange('severity', e.target.value)}
                className="w-full rounded-lg px-3 outline-none"
                style={{
                  height: '36px',
                  fontSize: '13px',
                  backgroundColor: theme.background.ghost,
                  color: theme.text.high,
                  border: `1px solid ${theme.stroke.medium}`,
                }}
              >
                <option value="warning">Warning</option>
                <option value="error">Error (block)</option>
                <option value="info">Info (suggest)</option>
              </select>
            </div>
          </>
        );

      case 'preferred_word':
        return (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                Preferred word *
              </label>
              <input
                type="text"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="e.g., encourage"
                required
                className="w-full rounded-lg px-3 outline-none"
                style={{
                  height: '36px',
                  fontSize: '13px',
                  backgroundColor: theme.background.ghost,
                  color: theme.text.high,
                  border: `1px solid ${theme.stroke.medium}`,
                }}
              />
            </div>
          </>
        );

      case 'auto_fix':
        return (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                Original text (to find) *
              </label>
              <input
                type="text"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="e.g., dont"
                required
                className="w-full rounded-lg px-3 outline-none"
                style={{
                  height: '36px',
                  fontSize: '13px',
                  backgroundColor: theme.background.ghost,
                  color: theme.text.high,
                  border: `1px solid ${theme.stroke.medium}`,
                }}
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                Replacement text *
              </label>
              <input
                type="text"
                value={formData.metadata.suggestion || ''}
                onChange={(e) => handleMetadataChange('suggestion', e.target.value)}
                placeholder="e.g., don't"
                required
                className="w-full rounded-lg px-3 outline-none"
                style={{
                  height: '36px',
                  fontSize: '13px',
                  backgroundColor: theme.background.ghost,
                  color: theme.text.high,
                  border: `1px solid ${theme.stroke.medium}`,
                }}
              />
            </div>
          </>
        );

      case 'product_definition':
        return (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                Product name *
              </label>
              <input
                type="text"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="e.g., JioCinema"
                required
                className="w-full rounded-lg px-3 outline-none"
                style={{
                  height: '36px',
                  fontSize: '13px',
                  backgroundColor: theme.background.ghost,
                  color: theme.text.high,
                  border: `1px solid ${theme.stroke.medium}`,
                }}
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                Ecosystem
              </label>
              <select
                value={formData.metadata.ecosystem || ''}
                onChange={(e) => handleMetadataChange('ecosystem', e.target.value)}
                className="w-full rounded-lg px-3 outline-none"
                style={{
                  height: '36px',
                  fontSize: '13px',
                  backgroundColor: theme.background.ghost,
                  color: theme.text.high,
                  border: `1px solid ${theme.stroke.medium}`,
                }}
              >
                <option value="">All ecosystems</option>
                <option value="JioCinema">JioCinema</option>
                <option value="JioMart">JioMart</option>
                <option value="JioTV">JioTV</option>
                <option value="JioFiber">JioFiber</option>
                <option value="MyJio">MyJio</option>
                <option value="JioFinance">JioFinance</option>
              </select>
            </div>
          </>
        );

      case 'festival':
        return (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                Festival name *
              </label>
              <input
                type="text"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="e.g., Diwali"
                required
                className="w-full rounded-lg px-3 outline-none"
                style={{
                  height: '36px',
                  fontSize: '13px',
                  backgroundColor: theme.background.ghost,
                  color: theme.text.high,
                  border: `1px solid ${theme.stroke.medium}`,
                }}
              />
            </div>
          </>
        );

      case 'approved_example':
        return (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                Example content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Enter the approved content example..."
                required
                rows={4}
                className="w-full rounded-lg px-3 py-2 outline-none resize-none"
                style={{
                  fontSize: '13px',
                  backgroundColor: theme.background.ghost,
                  color: theme.text.high,
                  border: `1px solid ${theme.stroke.medium}`,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                  Ecosystem
                </label>
                <select
                  value={formData.metadata.ecosystem || ''}
                  onChange={(e) => handleMetadataChange('ecosystem', e.target.value)}
                  className="w-full rounded-lg px-3 outline-none"
                  style={{
                    height: '36px',
                    fontSize: '13px',
                    backgroundColor: theme.background.ghost,
                    color: theme.text.high,
                    border: `1px solid ${theme.stroke.medium}`,
                  }}
                >
                  <option value="">All</option>
                  <option value="JioCinema">JioCinema</option>
                  <option value="JioMart">JioMart</option>
                  <option value="JioTV">JioTV</option>
                  <option value="JioFiber">JioFiber</option>
                  <option value="MyJio">MyJio</option>
                  <option value="JioFinance">JioFinance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
                  Channel
                </label>
                <select
                  value={formData.metadata.channel || ''}
                  onChange={(e) => handleMetadataChange('channel', e.target.value)}
                  className="w-full rounded-lg px-3 outline-none"
                  style={{
                    height: '36px',
                    fontSize: '13px',
                    backgroundColor: theme.background.ghost,
                    color: theme.text.high,
                    border: `1px solid ${theme.stroke.medium}`,
                  }}
                >
                  <option value="">All</option>
                  <option value="push_notification">Push notification</option>
                  <option value="in_app_message">In-app message</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="social_media">Social media</option>
                </select>
              </div>
            </div>
          </>
        );

      default:
        return (
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: theme.text.low }}>
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Enter content..."
              required
              rows={3}
              className="w-full rounded-lg px-3 py-2 outline-none resize-none"
              style={{
                fontSize: '13px',
                backgroundColor: theme.background.ghost,
                color: theme.text.high,
                border: `1px solid ${theme.stroke.medium}`,
              }}
            />
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{
          backgroundColor: theme.background.subtle,
          border: `1px solid ${theme.stroke.low}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 
          className="font-semibold mb-4"
          style={{ color: theme.text.high, fontSize: '16px' }}
        >
          {isEditing ? 'Edit' : 'Add'} {selectedType.replace('_', ' ')}
        </h3>

        <form onSubmit={handleSubmit}>
          {renderTypeSpecificFields()}

          {/* Active toggle */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="rounded"
            />
            <label 
              htmlFor="isActive" 
              className="text-sm"
              style={{ color: theme.text.medium }}
            >
              Active (used in content generation)
            </label>
          </div>

          {error && (
            <p className="text-sm mb-3" style={{ color: SEMANTIC_COLORS.negative }}>
              {error}
            </p>
          )}

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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.content}
              className="flex-1 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: '36px',
                fontSize: '13px',
                backgroundColor: theme.accent,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save changes' : 'Add item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────
interface DeleteConfirmProps {
  itemContent: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmModal({ itemContent, onConfirm, onCancel, isDeleting }: DeleteConfirmProps) {
  const theme = useThemeColors();
  
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6"
        style={{
          backgroundColor: theme.background.subtle,
          border: `1px solid ${theme.stroke.low}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 
          className="font-semibold mb-2"
          style={{ color: theme.text.high, fontSize: '16px' }}
        >
          Delete this item?
        </h3>
        <p className="text-sm mb-4" style={{ color: theme.text.medium }}>
          "{itemContent.slice(0, 50)}{itemContent.length > 50 ? '...' : ''}" will be deactivated.
        </p>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
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
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
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
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeItemEditor;
