/**
 * Accordion Component
 * 
 * A reusable collapsible section component with standardized styling.
 * Supports two variants:
 * - 'default': Clean list-style accordion (used in settings panels)
 * - 'card': Card-style with badge support (used in trust panels)
 */

import { useState, memo } from 'react';
import { useThemeColors } from '../../theme';
import { DSIcon } from '../DSIcon';

interface AccordionProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Visual variant: 'default' for list-style, 'card' for bordered card style */
  variant?: 'default' | 'card';
}

export const Accordion = memo(function Accordion({
  title,
  icon,
  badge,
  children,
  defaultOpen = false,
  variant = 'default',
}: AccordionProps) {
  const theme = useThemeColors();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isCard = variant === 'card';

  return (
    <div className="border rounded-lg" style={{ borderColor: theme.stroke.low, overflow: 'visible' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left transition-colors hover:opacity-80 p-3"
        style={{ 
          color: theme.text.high,
          backgroundColor: theme.background.ghost,
        }}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="w-4 h-4">{icon}</span>}
          <span className="text-xs font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge !== undefined && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: '#00A859', color: '#ffffff' }}
            >
              {badge}
            </span>
          )}
          <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: theme.text.medium }}>
            <DSIcon name="IcChevronDown" size="XS" attention="medium" />
          </span>
        </div>
      </button>
      {isOpen && (
        <div 
          className={isCard ? 'p-3' : 'px-4 pt-3 pb-3 space-y-4'}
          style={isCard ? { backgroundColor: theme.background.ghost } : undefined}
        >
          {children}
        </div>
      )}
    </div>
  );
});

export default Accordion;
