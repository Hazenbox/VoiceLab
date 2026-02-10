/**
 * DSIcon - Wrapper component for Jio Design System icons
 * 
 * Provides a cleaner API for using DS icons with lazy loading.
 * All icons are loaded dynamically for optimal bundle size.
 * 
 * @example
 * ```tsx
 * <DSIcon name="IcSearch" size="M" />
 * <DSIcon name="IcHome" size="L" attention="high" />
 * ```
 */

import { Icon } from '@marcelinodzn/ds-react';
import { LazyIcon } from '@marcelinodzn/ds-react/icons';

interface DSIconProps {
  /** Icon name from the DS library (e.g., "IcHome", "IcSearch") */
  name: string;
  /** Icon size - defaults to M (medium) */
  size?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  /** Visual emphasis level - defaults to high */
  attention?: 'low' | 'medium' | 'high';
  /** Additional CSS classes */
  className?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** Click handler */
  onClick?: () => void;
}

export function DSIcon({ 
  name, 
  size = 'M', 
  attention = 'high', 
  className,
  'aria-label': ariaLabel,
  onClick 
}: DSIconProps) {
  return (
    <Icon 
      size={size} 
      attention={attention} 
      className={className}
      aria-label={ariaLabel}
      onClick={onClick}
      asset={<LazyIcon name={name} />} 
    />
  );
}

export default DSIcon;
