import React, { useState, useEffect } from 'react';
import { useThemeColors } from '../theme';

interface SaveAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName: string;
}

export const SaveAudioModal: React.FC<SaveAudioModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName,
}) => {
  const theme = useThemeColors();
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg shadow-xl p-6 space-y-4"
        style={{
          backgroundColor: theme.background.ghost,
          border: `1px solid ${theme.stroke.medium}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <h2 
            className="text-lg font-semibold"
            style={{ color: theme.text.high }}
          >
            Save Audio to Library
          </h2>
          <p 
            className="text-sm"
            style={{ color: theme.text.medium }}
          >
            Give your audio a memorable name
          </p>
        </div>

        <div className="space-y-2">
          <label 
            className="block text-xs font-medium"
            style={{ color: theme.text.medium }}
          >
            Audio Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter audio name..."
            autoFocus
            className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{
              backgroundColor: theme.background.ghost,
              borderColor: theme.stroke.medium,
              color: theme.text.high,
            }}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:opacity-80"
            style={{
              backgroundColor: theme.background.subtle,
              border: `1px solid ${theme.stroke.medium}`,
              color: theme.text.high,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: '#f97316',
              color: 'white',
            }}
          >
            Save to Library
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveAudioModal;
