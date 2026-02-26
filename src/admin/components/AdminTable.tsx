import { memo } from 'react';
import { useThemeColors } from '../../theme/useColors';

interface AdminTableColumn {
  key: string;
  label: string;
  className?: string;
}

interface AdminTableProps {
  columns: AdminTableColumn[];
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

/**
 * Dense data table wrapper. 
 * 12px uppercase headers, 13px body, compact padding.
 * Matches the main app table aesthetic.
 */
export const AdminTable = memo(function AdminTable({
  columns,
  children,
  emptyMessage = 'No data to display.',
  isEmpty = false,
}: AdminTableProps) {
  const theme = useThemeColors();

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left py-1.5 px-3 ${col.className || ''}`}
                style={{ 
                  color: theme.text.high, 
                  fontSize: '12px',
                  fontWeight: 400,
                  lineHeight: 1.3,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-6 px-3 text-center"
                style={{ color: theme.text.low, fontSize: '13px' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
});

/**
 * A single table row with consistent bottom border.
 */
export const AdminTableRow = memo(function AdminTableRow({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useThemeColors();
  return (
    <tr style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
      {children}
    </tr>
  );
});

/**
 * Standard table cell with compact padding and consistent font.
 */
export const AdminTableCell = memo(function AdminTableCell({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const theme = useThemeColors();
  return (
    <td
      className={`py-1.5 px-3 ${className}`}
      style={{ color: theme.text.high, fontSize: '13px', ...style }}
    >
      {children}
    </td>
  );
});

export default AdminTable;
