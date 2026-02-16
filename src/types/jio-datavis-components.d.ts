declare module "@jio/datavis-components" {
  import type { RefObject } from "react";

  // ── Shared Interfaces ───────────────────────────────────────────

  export interface ModesConfig {
    Platform?: string;
    Density?: string;
    colourTheme?: string;
    colourMode?: "Light" | "Dark";
    Brand?: string;
    fullWidth?: boolean;
    size?: "L" | "M";
    appearance?: "Neutral";
    fillEmphasis?: "Subtle" | "Bold";
    backgroundLevel?: string;
  }

  export interface ValueFormatConfig {
    type?: "number" | "percentage" | "currency";
    currency?: "INR" | "USD" | "GBP" | "EUR";
    decimals?: number;
    minDecimals?: number;
    maxDecimals?: number;
    useGrouping?: boolean;
    numberSystem?: "international" | "indian";
    abbreviate?: boolean;
    abbreviationStyle?: "short" | "long" | "none";
    forceSign?: boolean;
    isDecimal?: boolean;
    display?: "symbol" | "code" | "name";
  }

  export interface AccessibilityConfig {
    enabled?: boolean;
    summary?: string;
    dataTable?: boolean;
    ariaLabel?: string;
  }

  export interface ChartHeaderConfig {
    title?: string;
    subtitle?: string;
    showSubtitle?: boolean;
    fullWidth?: boolean;
  }

  export interface ChartFooterConfig {
    source?: string;
    notes?: string;
    fullWidth?: boolean;
  }

  export interface ChartLegendItem {
    type?: "circle" | "line" | "dashed";
    label?: string;
    color?: string;
    [key: string]: unknown;
  }

  export interface ChartLegendConfig {
    items?: ChartLegendItem[];
    width?: number;
    series1Label?: string;
    series2Label?: string;
    series3Label?: string;
    projectionLabel?: string;
    projectionBandLabel?: string;
    [key: string]: unknown;
  }

  export interface DataHeadConfig {
    leadValue?: string;
    supportingValue?: string;
    valueFormat?: ValueFormatConfig;
    supportingValueFormat?: ValueFormatConfig;
    supportingPrefix?: string;
    supportingLabelText?: string;
    showDataSupporting?: boolean;
    showSupportingLabel?: boolean;
    showSupportingLabelIcon?: boolean;
    alignment?: "left" | "center";
  }

  export interface DataDisplayConfig {
    mode?: "static" | "hover";
    label?: string;
    showLabelIcon?: boolean;
    leadValue?: string;
    supportingValue?: string;
    valueFormat?: ValueFormatConfig;
    supportingValueFormat?: ValueFormatConfig;
    supportingPrefix?: string;
    showSupportingValue?: boolean;
    supportingLabel?: string;
    showSupportingLabel?: boolean;
    showSupportingLabelIcon?: boolean;
    badgeSupportingLabel?: string;
    showSupportingLabelBadge?: boolean;
    showContentRight?: boolean;
    showContentRightTop?: boolean;
    showContentRightBottom?: boolean;
    showDataBadgeSemantic?: boolean;
    badgeValue?: string;
    badgeValueFormat?: ValueFormatConfig;
    badgeAutoDetect?: boolean;
    badgeSemanticMode?: "positive" | "negative" | "neutral";
    showBadgeIcon?: boolean;
    size?: "L" | "M";
    type?: "Left" | "Centered";
    formatHoverLeadValue?: (v: number) => string;
    formatHoverBadgeValue?: (v: number) => string;
    [key: string]: unknown;
  }

  // ── Data Shapes ─────────────────────────────────────────────────

  export interface ChartDataPoint {
    id?: string;
    category?: string;
    label?: string;
    value: number;
    color?: string;
    colorIndex?: number;
  }

  export interface ChartSeriesDataPoint {
    category: string;
    series: string;
    value: number;
    color?: string;
  }

  export interface MultiBarDataPoint {
    label: string;
    value1: number;
    value2?: number;
    value3?: number;
    bar1Color?: string;
    bar2Color?: string;
    bar3Color?: string;
  }

  export interface StackedSegment {
    value: number;
    label: string;
    color?: string;
  }

  export interface StackedBarDataPoint {
    label: string;
    segments: StackedSegment[];
    totalLabel?: string;
  }

  export interface LineSeries {
    name: string;
    values: number[];
    color?: string;
    strokeWidth?: number;
  }

  export interface LineSeriesData {
    categories: string[];
    series: LineSeries[];
  }

  export interface TimeSeriesDataPoint {
    category: string;
    value: number;
    upperBound?: number;
    lowerBound?: number;
  }

  // ── Bar Group Configs ───────────────────────────────────────────

  export interface VerticalBarGroupConfig {
    type?: string;
    showTopLabels?: boolean;
    showCategoryLabels?: boolean;
    showYAxis?: boolean;
    showAvgLine?: boolean;
    showHoverBadge?: boolean;
    yAxisTickCount?: number;
    valueFormat?: ValueFormatConfig;
    formatYAxisValue?: (v: number) => string;
    formatAvgValue?: (v: number) => string;
    formatHoverValue?: (v: number) => string;
    barWidth?: "M";
    interactive?: boolean;
    seriesOrder?: string[];
    hoverType?: "group" | "categorical";
    [key: string]: unknown;
  }

  export interface HorizontalBarGroupConfig {
    showValueLabels?: boolean;
    showValueLabelsInside?: boolean;
    showCategoryLabels?: boolean;
    showCategoryLabelsInside?: boolean;
    showXAxis?: boolean;
    xAxisTickCount?: number;
    valueFormat?: ValueFormatConfig;
    formatXAxisValue?: (v: number) => string;
    barHeight?: "M";
    showHoverBadge?: boolean;
    formatHoverValue?: (v: number) => string;
    [key: string]: unknown;
  }

  export interface PathGroupConfig {
    showYAxis?: boolean;
    showXAxis?: boolean;
    interactive?: boolean;
    showHoverLine?: boolean;
    yAxisTickCount?: number;
    rounded?: boolean;
    curveStyle?: "Sharp" | "Curved";
    valueFormat?: ValueFormatConfig;
    formatYAxisValue?: (v: number) => string;
    [key: string]: unknown;
  }

  export interface AreaGroupConfig {
    showYAxis?: boolean;
    showXAxis?: boolean;
    yAxisTickCount?: number;
    curveStyle?: "Sharp" | "Curved";
    valueFormat?: ValueFormatConfig;
    formatYAxisValue?: (v: number) => string;
    interactive?: boolean;
    showHoverBadge?: boolean;
    formatHoverValue?: (v: number) => string;
    [key: string]: unknown;
  }

  // ── Top-Level Chart Props ───────────────────────────────────────

  interface BaseChartProps {
    width?: number;
    height?: number;
    showHeader?: boolean;
    showFooter?: boolean;
    showLegend?: boolean;
    showDataDisplay?: boolean;
    interactive?: boolean;
    chartHeader?: ChartHeaderConfig;
    chartLegend?: ChartLegendConfig;
    dataDisplay?: DataDisplayConfig;
    chartFooter?: ChartFooterConfig;
    modes?: ModesConfig;
    accessibility?: AccessibilityConfig;
  }

  export interface VerticalBarChartProps extends BaseChartProps {
    data: ChartDataPoint[];
    barGroup?: VerticalBarGroupConfig;
  }

  export interface HorizontalBarChartProps extends BaseChartProps {
    data: ChartDataPoint[];
    barGroup?: HorizontalBarGroupConfig;
  }

  export interface VerticalMultiBarChartProps extends BaseChartProps {
    data: MultiBarDataPoint[];
    seriesOrder?: string[];
    hoverType?: "group" | "categorical";
    barGroup?: VerticalBarGroupConfig;
  }

  export interface VerticalStackedBarChartProps extends BaseChartProps {
    data: StackedBarDataPoint[];
    seriesOrder?: string[];
    hoverType?: "group" | "categorical";
    barGroup?: VerticalBarGroupConfig;
  }

  export interface LineChartProps extends BaseChartProps {
    data: LineSeriesData;
    seriesOrder?: string[];
    pathGroup?: PathGroupConfig;
  }

  export interface AreaChartProps extends BaseChartProps {
    data: LineSeriesData;
    seriesOrder?: string[];
    areaGroup?: AreaGroupConfig;
  }

  export interface ProjectionLineChartProps extends BaseChartProps {
    data: TimeSeriesDataPoint[];
    onHover?: (data: unknown) => void;
    projectionPathGroup?: PathGroupConfig;
  }

  export interface LinearProgressBarProps {
    showInlineChartKey?: boolean;
    showSupportingLabels?: boolean;
    color?: string;
    width?: number;
    inlineChartKey?: {
      label?: string;
      type?: "circle";
      color?: string;
      showShapeIndicator?: boolean;
      showDataSlot1?: boolean;
      showDataSlot2?: boolean;
      dataValue1?: string;
      dataValue2?: string;
      width?: number;
    };
    horizontalBar?: {
      barWidthPercent?: number;
      barHeight?: "M";
      color?: string;
    };
    supportingLabels?: {
      showLeft?: boolean;
      showRight?: boolean;
      leftText?: string;
      rightText?: string;
    };
    modes?: ModesConfig;
  }

  export interface DataCardProps {
    title?: string;
    showTitle?: boolean;
    formatTitle?: boolean;
    formatOptions?: Record<string, unknown>;
    width?: number;
    fillEmphasis?: "Subtle" | "Bold";
    size?: "L";
    backgroundLevel?: string;
    appearance?: "Neutral";
    dataHead?: DataHeadConfig;
    modes?: ModesConfig;
  }

  // ── New Chart Props (v0.1.0 update) ────────────────────────────

  export interface DonutChartProps extends BaseChartProps {
    data: ChartDataPoint[];
    showInlineChartKeyGroup?: boolean;
    donutGroup?: {
      arcWidth?: "M";
      innerRadiusRatio?: number;
      startAngle?: number;
      padAngle?: number;
      showDataDisplay?: boolean;
      showHoverBadge?: boolean;
      formatHoverValue?: (v: number) => string;
      onArcHover?: (index: number | null) => void;
      onArcClick?: (index: number) => void;
      hoveredArcIndex?: number | null;
      [key: string]: unknown;
    };
    inlineChartKeyGroup?: Record<string, unknown>;
  }

  export interface HistogramChartProps extends BaseChartProps {
    data: ChartDataPoint[];
    histogramGroup?: {
      showYAxis?: boolean;
      showXAxis?: boolean;
      showAvgLine?: boolean;
      showHoverBadge?: boolean;
      yAxisTickCount?: number;
      valueFormat?: ValueFormatConfig;
      formatYAxisValue?: (v: number) => string;
      formatAvgValue?: (v: number) => string;
      color?: string;
      colorIndex?: number;
      onBarHover?: (index: number | null) => void;
      onBarClick?: (index: number) => void;
      hoveredBarIndex?: number | null;
      [key: string]: unknown;
    };
  }

  export interface AreaHeatMapChartProps extends BaseChartProps {
    data: ChartSeriesDataPoint[];
    colorLevels?: number;
    sequentialColorSet?: number;
    heatmapGroup?: {
      showYAxis?: boolean;
      showXAxis?: boolean;
      formatHoverValue?: (v: number) => string;
      onCellHover?: (data: unknown) => void;
      onCellClick?: (data: unknown) => void;
      [key: string]: unknown;
    };
  }

  export interface ClusteredBubbleChartProps extends BaseChartProps {
    data: ChartDataPoint[];
    showInlineChartKeyGroup?: boolean;
    bubbleGroup?: {
      minRadius?: number;
      maxRadius?: number;
      forceStrength?: number;
      showHoverBadge?: boolean;
      formatHoverValue?: (v: number) => string;
      onBubbleHover?: (index: number | null) => void;
      onBubbleClick?: (index: number) => void;
      hoveredBubbleIndex?: number | null;
      [key: string]: unknown;
    };
    inlineChartKeyGroup?: Record<string, unknown>;
  }

  export interface HorizontalButterflyBarChartProps extends BaseChartProps {
    data: ChartSeriesDataPoint[];
    seriesOrder?: string[];
    barGroup?: {
      showValueLabels?: boolean;
      showValueLabelsInside?: boolean;
      categoryLabelWidth?: number;
      showHoverBadge?: boolean;
      formatHoverValue?: (v: number) => string;
      onBarHover?: (index: number | null) => void;
      onBarClick?: (index: number) => void;
      hoveredRowIndex?: number | null;
      [key: string]: unknown;
    };
  }

  export interface HorizontalDumbbellChartProps extends BaseChartProps {
    data: ChartSeriesDataPoint[];
    seriesOrder?: string[];
    barGroup?: {
      showLeftLabels?: boolean;
      showRightLabels?: boolean;
      showCategoryLabels?: boolean;
      showXAxis?: boolean;
      showHoverBadge?: boolean;
      formatHoverValue?: (v: number) => string;
      onBarHover?: (index: number | null) => void;
      onBarClick?: (index: number) => void;
      hoveredBarIndex?: number | null;
      [key: string]: unknown;
    };
  }

  export interface HorizontalStackedBarChartProps extends BaseChartProps {
    data: ChartSeriesDataPoint[];
    seriesOrder?: string[];
    hoverType?: "group" | "individual" | "categorical";
    barGroup?: HorizontalBarGroupConfig;
  }

  export interface LollipopBarChartProps extends BaseChartProps {
    data: ChartDataPoint[];
    barGroup?: VerticalBarGroupConfig;
  }

  // ── Standalone Component Props ──────────────────────────────────

  interface WithModes {
    modes?: ModesConfig;
  }

  export interface ChartHeaderProps extends WithModes {
    title?: string;
    subtitle?: string;
    showSubtitle?: boolean;
    fullWidth?: boolean;
  }

  export interface ChartFooterProps extends WithModes {
    source?: string;
    notes?: string;
    fullWidth?: boolean;
  }

  export interface ChartTitleProps extends WithModes {
    title?: string;
  }

  export interface ChartSubtitleProps extends WithModes {
    subtitle?: string;
  }

  export interface ChartBodyProps extends WithModes {
    body?: string;
    maxLines?: number;
    chartBodyWeight?: "Low" | "High";
  }

  export interface DataBadgeProps extends WithModes {
    value?: string;
  }

  export interface DataHeadProps extends DataHeadConfig, WithModes {}

  export interface DataLeadProps extends WithModes {
    value?: string;
    valueFormat?: ValueFormatConfig;
  }

  export interface DataSupportingProps extends WithModes {
    value?: string;
    valueFormat?: ValueFormatConfig;
  }

  export interface SupportingLabelProps extends WithModes {
    text?: string;
    showIcon?: boolean;
    size?: "M";
    formatText?: boolean;
    formatOptions?: Record<string, unknown>;
  }

  export interface ChartKeyProps extends WithModes {
    type?: "circle" | "line" | "dashed";
    label?: string;
    color?: string;
    chartBodyWeight?: "Low" | "High";
    showShapeIndicator?: boolean;
    showDataHead?: boolean;
    leadValue?: string;
    supportingValue?: string;
    valueFormat?: ValueFormatConfig;
    supportingValueFormat?: ValueFormatConfig;
    supportingPrefix?: string;
    supportingLabelText?: string;
    showDataSupporting?: boolean;
    showSupportingLabel?: boolean;
  }

  export interface ChartLegendProps extends WithModes {
    items?: ChartLegendItem[];
    width?: number;
  }

  export interface InlineChartKeyProps extends WithModes {
    label?: string;
    type?: "circle";
    color?: string;
    showShapeIndicator?: boolean;
    showDataSlot1?: boolean;
    showDataSlot2?: boolean;
    dataValue1?: string;
    dataValue2?: string;
    width?: number;
  }

  export interface ShapeRectProps extends WithModes {
    width?: number;
    height?: number;
    color?: string;
    colorIndex?: number;
    isHovered?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: () => void;
    fillContainer?: boolean;
    cursor?: string;
  }

  export interface ChartAxisTickProps extends WithModes {
    value?: string;
  }

  export interface XAxisProps extends WithModes {
    scale?: unknown;
    ticks?: unknown[];
    formatTick?: (v: unknown) => string;
  }

  export interface YAxisProps extends WithModes {
    scale?: unknown;
    tickCount?: number;
    formatTick?: (v: unknown) => string;
  }

  export type ZeroLineProps = WithModes;

  export interface AvgLineProps extends WithModes {
    position?: number;
    label?: string;
    showLabel?: boolean;
  }

  export interface HoverLineProps extends WithModes {
    x?: number;
    svgHeight?: number;
    data?: unknown;
    yScale?: unknown;
    formatValue?: (v: unknown) => string;
  }

  export interface HoverBadgeProps extends WithModes {
    mouseX?: number;
    mouseY?: number;
    formattedValue?: string;
    containerWidth?: number;
    isAnimating?: boolean;
    enterDuration?: number;
    enterEasing?: string;
    exitDuration?: number;
    exitEasing?: string;
  }

  export interface PathsProps extends WithModes {
    paths?: { d: string; strokeWidth?: number; strokeColor?: string; className?: string }[];
    rounded?: boolean;
    className?: string;
  }

  export interface VerticalBarProps extends WithModes {
    type?: "verticalBarBasic" | "verticalBarWithNegative";
    value?: number;
    barHeight?: number;
    zeroLinePosition?: number;
    topLabel?: string;
    bottomLabel?: string;
    categoryLabel?: string;
    showTopOutsideLabel?: boolean;
    showBottomOutsideLabel?: boolean;
    showCategoryLabels?: boolean;
    showBarPositive?: boolean;
    showBarNegative?: boolean;
    height?: number;
    color?: string;
    colorIndex?: number;
    dataIndex?: number;
    isHovered?: boolean;
    onHover?: (index: number | null) => void;
    onClick?: (index: number) => void;
    isDimmed?: boolean;
    barWidth?: "M";
  }

  export interface HorizontalBarProps extends WithModes {
    rightOutsideLabel?: string;
    rightInsideLabel?: string;
    categoryLabelInside?: string;
    categoryLabelOutside?: string;
    showRightOutsideLabel?: boolean;
    showRightInsideLabel?: boolean;
    showCategoryLabelInside?: boolean;
    showCategoryLabelOutside?: boolean;
    categoryLabelWidth?: number;
    width?: number;
    fullWidth?: boolean;
    barWidthPercent?: number;
    color?: string;
    colorIndex?: number;
    value?: number;
    dataIndex?: number;
    isHovered?: boolean;
    onHover?: (index: number | null) => void;
    onClick?: (index: number) => void;
    isDimmed?: boolean;
    barHeight?: "M";
  }

  export interface VerticalBarGroupProps extends WithModes {
    data: ChartDataPoint[];
    type?: string;
    width?: number;
    height?: number;
    fullWidth?: boolean;
    showTopLabels?: boolean;
    showCategoryLabels?: boolean;
    showYAxis?: boolean;
    showAvgLine?: boolean;
    showHoverBadge?: boolean;
    yAxisTickCount?: number;
    valueFormat?: ValueFormatConfig;
    formatYAxisValue?: (v: number) => string;
    formatAvgValue?: (v: number) => string;
    formatHoverValue?: (v: number) => string;
    barWidth?: "M";
    interactive?: boolean;
    onBarHover?: (index: number | null) => void;
    onBarClick?: (index: number) => void;
    hoveredBarIndex?: number | null;
  }

  export interface HorizontalBarGroupProps extends WithModes {
    data: ChartDataPoint[];
    width?: number;
    height?: number;
    fullWidth?: boolean;
    showValueLabels?: boolean;
    showValueLabelsInside?: boolean;
    showCategoryLabels?: boolean;
    showCategoryLabelsInside?: boolean;
    showXAxis?: boolean;
    xAxisTickCount?: number;
    valueFormat?: ValueFormatConfig;
    formatXAxisValue?: (v: number) => string;
    barHeight?: "M";
    showHoverBadge?: boolean;
    formatHoverValue?: (v: number) => string;
    onBarHover?: (index: number | null) => void;
    onBarClick?: (index: number) => void;
    hoveredBarIndex?: number | null;
  }

  export type VerticalMultiBarProps = WithModes & Record<string, unknown>;

  export interface VerticalMultiBarGroupProps extends WithModes {
    data: MultiBarDataPoint[];
    [key: string]: unknown;
  }

  export type VerticalStackedBarProps = WithModes & Record<string, unknown>;

  export interface VerticalStackedBarGroupProps extends WithModes {
    data: StackedBarDataPoint[];
    [key: string]: unknown;
  }

  export interface PathGroupProps extends WithModes {
    data: LineSeriesData;
    seriesOrder?: string[];
    width?: number;
    height?: number;
    fullWidth?: boolean;
    showYAxis?: boolean;
    showXAxis?: boolean;
    interactive?: boolean;
    showHoverLine?: boolean;
    yAxisTickCount?: number;
    rounded?: boolean;
    curveStyle?: "Sharp" | "Curved";
    valueFormat?: ValueFormatConfig;
    formatYAxisValue?: (v: number) => string;
    onHover?: (data: unknown) => void;
  }

  export interface ProjectionPathGroupProps extends WithModes {
    data: TimeSeriesDataPoint[];
    [key: string]: unknown;
  }

  export interface AreaGroupProps extends WithModes {
    data: LineSeriesData;
    seriesOrder?: string[];
    width?: number;
    height?: number;
    showYAxis?: boolean;
    showXAxis?: boolean;
    yAxisTickCount?: number;
    curveStyle?: "Sharp" | "Curved";
    valueFormat?: ValueFormatConfig;
    formatYAxisValue?: (v: number) => string;
    interactive?: boolean;
    showHoverBadge?: boolean;
    formatHoverValue?: (v: number) => string;
    onSeriesHover?: (index: number | null) => void;
    onSeriesClick?: (index: number) => void;
    hoveredSeriesIndex?: number | null;
  }

  // ── Chart Components ──────────────────────────────────────────────

  export function VerticalBarChart(props: VerticalBarChartProps): React.JSX.Element;
  export function HorizontalBarChart(props: HorizontalBarChartProps): React.JSX.Element;
  export function VerticalMultiBarChart(props: VerticalMultiBarChartProps): React.JSX.Element;
  export function VerticalStackedBarChart(props: VerticalStackedBarChartProps): React.JSX.Element;
  export function LineChart(props: LineChartProps): React.JSX.Element;
  export function AreaChart(props: AreaChartProps): React.JSX.Element;
  export function ProjectionLineChart(props: ProjectionLineChartProps): React.JSX.Element;
  export function LinearProgressBar(props: LinearProgressBarProps): React.JSX.Element;
  export function DataCard(props: DataCardProps): React.JSX.Element;
  export function DonutChart(props: DonutChartProps): React.JSX.Element;
  export function HistogramChart(props: HistogramChartProps): React.JSX.Element;
  export function AreaHeatMapChart(props: AreaHeatMapChartProps): React.JSX.Element;
  export function ClusteredBubbleChart(props: ClusteredBubbleChartProps): React.JSX.Element;
  export function HorizontalButterflyBarChart(props: HorizontalButterflyBarChartProps): React.JSX.Element;
  export function HorizontalDumbbellChart(props: HorizontalDumbbellChartProps): React.JSX.Element;
  export function HorizontalStackedBarChart(props: HorizontalStackedBarChartProps): React.JSX.Element;
  export function LollipopBarChart(props: LollipopBarChartProps): React.JSX.Element;

  export function ChartHeader(props: ChartHeaderProps): React.JSX.Element;
  export function ChartFooter(props: ChartFooterProps): React.JSX.Element;
  export function ChartTitle(props: ChartTitleProps): React.JSX.Element;
  export function ChartSubtitle(props: ChartSubtitleProps): React.JSX.Element;
  export function ChartBody(props: ChartBodyProps): React.JSX.Element;
  export function ChartKey(props: ChartKeyProps): React.JSX.Element;
  export function ChartLegend(props: ChartLegendProps): React.JSX.Element;
  export function InlineChartKey(props: InlineChartKeyProps): React.JSX.Element;
  export function DataBadge(props: DataBadgeProps): React.JSX.Element;
  export function DataHead(props: DataHeadProps): React.JSX.Element;
  export function DataLead(props: DataLeadProps): React.JSX.Element;
  export function DataSupporting(props: DataSupportingProps): React.JSX.Element;
  export function SupportingLabel(props: SupportingLabelProps): React.JSX.Element;
  export function ShapeRect(props: ShapeRectProps): React.JSX.Element;
  export function ChartAxisTick(props: ChartAxisTickProps): React.JSX.Element;
  export function XAxis(props: XAxisProps): React.JSX.Element;
  export function YAxis(props: YAxisProps): React.JSX.Element;
  export function ZeroLine(props: ZeroLineProps): React.JSX.Element;
  export function AvgLine(props: AvgLineProps): React.JSX.Element;
  export function HoverLine(props: HoverLineProps): React.JSX.Element;
  export function HoverBadge(props: HoverBadgeProps): React.JSX.Element;
  export function Paths(props: PathsProps): React.JSX.Element;
  export function VerticalBar(props: VerticalBarProps): React.JSX.Element;
  export function HorizontalBar(props: HorizontalBarProps): React.JSX.Element;
  export function VerticalBarGroup(props: VerticalBarGroupProps): React.JSX.Element;
  export function HorizontalBarGroup(props: HorizontalBarGroupProps): React.JSX.Element;
  export function VerticalMultiBar(props: VerticalMultiBarProps): React.JSX.Element;
  export function VerticalMultiBarGroup(props: VerticalMultiBarGroupProps): React.JSX.Element;
  export function VerticalStackedBar(props: VerticalStackedBarProps): React.JSX.Element;
  export function VerticalStackedBarGroup(props: VerticalStackedBarGroupProps): React.JSX.Element;
  export function PathGroup(props: PathGroupProps): React.JSX.Element;
  export function ProjectionPathGroup(props: ProjectionPathGroupProps): React.JSX.Element;
  export function AreaGroup(props: AreaGroupProps): React.JSX.Element;
  export function DonutPathGroup(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function HistogramGroup(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function AreaHeatMapGroup(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function ClusteredBubbleGroup(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function HorizontalButterflyBar(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function HorizontalButterflyBarGroup(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function HorizontalDumbbellBar(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function HorizontalDumbbellBarGroup(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function HorizontalStackedBar(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function HorizontalStackedBarGroup(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function LollipopBar(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function LollipopBarGroup(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function ChartAccessibility(props: { children: React.ReactNode; chartType: string; title?: string; subtitle?: string; data: unknown; accessibility?: AccessibilityConfig }): React.JSX.Element;
  export function DataBadgeSemantic(props: WithModes & { value?: string; formatValue?: (v: string) => string; mode?: "positive" | "negative" | "neutral"; showIcon?: boolean }): React.JSX.Element;
  export function DataDisplay(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function InlineChartKeyGroup(props: WithModes & Record<string, unknown>): React.JSX.Element;
  export function SequentialChartKey(props: WithModes & Record<string, unknown>): React.JSX.Element;

  // ── Hooks ─────────────────────────────────────────────────────────

  export interface UseHoverBadgeOptions {
    interactive?: boolean;
    showHoverBadge?: boolean;
    formatValue?: (value: number, label?: string, secondaryValue?: number) => string;
    modes?: ModesConfig;
    containerRef?: RefObject<HTMLElement>;
  }

  export interface UseHoverBadgeReturn {
    setHoverData: (data: { mouseX: number; mouseY: number; value: number; label?: string; secondaryValue?: number } | null) => void;
    badgeProps: HoverBadgeProps | null;
    isVisible: boolean;
    hoverData: { mouseX: number; mouseY: number; value: number; label?: string } | null;
  }

  export function useHoverBadge(options: UseHoverBadgeOptions): UseHoverBadgeReturn;

  // ── Utility Functions ─────────────────────────────────────────────

  export function calculateLabelPadding(config: Record<string, unknown>): { paddingLeft: number; paddingRight: number; totalPadding: number };
  export function calculateLabelPaddingRatio(config: Record<string, unknown>, containerWidth: number): Record<string, number>;
  export function clearCache(): void;
  export function getCacheStats(): { hits: number; misses: number };
  export function createAxisFormatter(config: ValueFormatConfig): (value: number) => string;
  export function createFormatter(config: ValueFormatConfig): (value: number) => string;
  export function createLabelFormatter(config: ValueFormatConfig): (value: number) => string;
  export function findVariablesByPattern(pattern: string): unknown[];
  export function formatCurrency(value: number, options: ValueFormatConfig): string;
  export function formatFooterText(text: string, config?: { maxChars?: number }): string;
  export function formatLabel(text: string, options?: Record<string, unknown>): string;
  export function formatLargeNumber(value: number, options?: ValueFormatConfig): string;
  export function formatNumber(value: number, options?: ValueFormatConfig): string;
  export function formatPercentage(value: number, options?: ValueFormatConfig): string;
  export function formatSentence(text: string, options?: Record<string, unknown>): string;
  export function formatValue(value: number, options: ValueFormatConfig): string;
  export function getAvailableCollections(): Record<string, unknown>;
  export function getCurrencyConfig(currency: string): { symbol: string; code: string; name: string; symbolPosition: string; numberSystem: string };
  export function getLabelPaddingStyle(config: Record<string, unknown>): { paddingLeft: string; paddingRight: string };
  export function getSupportedCurrencies(): string[];
  export function getVariableByName(name: string, modesByCollectionName?: Record<string, string>): string | number | null;
  export function hasPunctuation(text: string): boolean;
  export function isCapitalized(text: string): boolean;
  export function joinSentences(segments: string[], separator?: string): string;
  export function measureTextWidth(text: string, fontSize?: number, fontFamily?: string, fontWeight?: string): number;
  export function resolveVariable(variableId: string, modesByCollectionName?: Record<string, string>): string | number | null;
  export function shouldAbbreviate(value: number, threshold?: number, numberSystem?: string): boolean;
  export function stripPunctuation(text: string): string;
  export function validateText(text: string): { isValid: boolean; issues: string[] };

  // ── Data Type Guards ──────────────────────────────────────────────

  export function isChartDataPoint(obj: unknown): obj is ChartDataPoint;
  export function isChartSeriesDataPoint(obj: unknown): obj is ChartSeriesDataPoint;
  export function isLegacyLabelValue(obj: unknown): boolean;
  export function isLegacyWideFormat(obj: unknown): boolean;
  export function isLegacyNestedSegments(obj: unknown): boolean;
  export function isLegacyCategoriesSeries(obj: unknown): boolean;

  // ── Data Maps / Constants ─────────────────────────────────────────

  export const collectionMap: Map<string, unknown>;
  export const footerTextStyles: Record<string, string>;
  export const keyMap: Map<string, unknown>;
  export const modeMap: Map<string, Record<string, string>>;
  export const nameMap: Map<string, unknown>;
  export const variableMap: Map<string, unknown>;
}
