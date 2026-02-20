import { memo } from 'react';

/**
 * Dotted Background Pattern
 */
export const DottedBackground = memo(function DottedBackground({ color }: { color: string }) {
  return (
    <defs>
      <pattern id="dotted-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill={color} />
      </pattern>
    </defs>
  );
});

/**
 * Flow Diagram Component - Reusable SVG-based flow visualization
 */
export interface FlowNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  color: string;
  textColor: string;
  strokeColor: string;
  badge?: { text: string; color: string; textColor: string };
  noShadow?: boolean;
}

export const FlowNode = memo(function FlowNode({ 
  x, y, width, height, label, sublabel, color, textColor, strokeColor, badge, noShadow
}: FlowNodeProps) {
  return (
    <g>
      {/* Main Card */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill={color}
        stroke={strokeColor}
        strokeWidth={1}
        filter={noShadow ? undefined : "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.05))"}
      />
      
      {/* Badge (if present) */}
      {badge && (
        <g transform={`translate(${x + width/2}, ${y - 10})`}>
          <rect
            x={-(badge.text.length * 3 + 8)}
            y={-10}
            width={badge.text.length * 6 + 16}
            height={20}
            rx={10}
            fill={badge.color}
          />
          <text
            x={0}
            y={1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={badge.textColor}
            fontSize={10}
            fontWeight={600}
            fontFamily="'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          >
            {badge.text}
          </text>
        </g>
      )}

      {/* Content */}
      <text
        x={x + width / 2}
        y={sublabel ? y + height / 2 - 6 : y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={12}
        fontWeight={500}
        fontFamily="'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={textColor}
          fontSize={10}
          opacity={0.7}
          fontFamily="'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        >
          {sublabel}
        </text>
      )}
    </g>
  );
});

/**
 * Curved Arrow Component for flow diagrams
 */
export interface CurvedFlowArrowProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  dashed?: boolean;
  label?: string;
}

export const CurvedFlowArrow = memo(function CurvedFlowArrow({ startX, startY, endX, endY, color, dashed, label }: CurvedFlowArrowProps) {
  const controlY1 = startY + (endY - startY) / 2;
  const controlY2 = endY - (endY - startY) / 2;
  
  const path = `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  return (
    <g>
      <defs>
        <marker
          id={`arrowhead-curved-${startX}-${startY}-${endX}-${endY}`}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M 0 0 L 10 6 L 0 12 L 2 6 Z"
            fill={color}
            stroke="none"
          />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={dashed ? "4" : undefined}
        markerEnd={`url(#arrowhead-curved-${startX}-${startY}-${endX}-${endY})`}
      />
      {/* Start dot */}
      <circle cx={startX} cy={startY} r={3} fill={color} />
      
      {label && (
        <text
          x={midX}
          y={midY}
          textAnchor="middle"
          fill={color}
          fontSize={10}
          fontFamily="'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          style={{ backgroundColor: 'white' }} 
        >
          {label}
        </text>
      )}
    </g>
  );
});

/**
 * Arrow Component for flow diagrams
 */
export interface FlowArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  label?: string;
  dashed?: boolean;
}

export const FlowArrow = memo(function FlowArrow({ x1, y1, x2, y2, color, label, dashed }: FlowArrowProps) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  
  return (
    <g>
      <defs>
        <marker
          id={`arrowhead-${x1}-${y1}-${x2}-${y2}`}
          markerWidth="12"
          markerHeight="8"
          refX="10"
          refY="4"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="0"
            x2="10"
            y2="4"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="8"
            x2="10"
            y2="4"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={dashed ? "4" : undefined}
        markerEnd={`url(#arrowhead-${x1}-${y1}-${x2}-${y2})`}
      />
      {label && (
        <text
          x={midX}
          y={midY - 8}
          textAnchor="middle"
          fill={color}
          fontSize={10}
          fontFamily="'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        >
          {label}
        </text>
      )}
    </g>
  );
});

/**
 * Flow Canvas Component
 */
export interface FlowCanvasProps {
  width?: string | number;
  height: number;
  viewBox: string;
  children: React.ReactNode;
  dotColor: string;
}

export const FlowCanvas = memo(function FlowCanvas({ width = "100%", height, viewBox, children, dotColor }: FlowCanvasProps) {
  return (
    <svg width={width} height={height} viewBox={viewBox}>
      <DottedBackground color={dotColor} />
      <rect x="0" y="0" width="100%" height="100%" fill="url(#dotted-pattern)" />
      {children}
    </svg>
  );
});
