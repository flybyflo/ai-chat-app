import type { ChartType, ChartRendererProps } from './types';
import { BarChartRenderer } from './renderers/bar-chart-renderer';
import { LineChartRenderer } from './renderers/line-chart-renderer';
import { PieChartRenderer } from './renderers/pie-chart-renderer';
import { AreaChartRenderer } from './renderers/area-chart-renderer';
import { ScatterChartRenderer } from './renderers/scatter-chart-renderer';
import { RadarChartRenderer } from './renderers/radar-chart-renderer';

type ChartRenderer = React.ComponentType<ChartRendererProps>;

// Registry of all chart components
const chartComponents: Record<ChartType, ChartRenderer> = {
  bar: BarChartRenderer,
  line: LineChartRenderer,
  pie: PieChartRenderer,
  area: AreaChartRenderer,
  scatter: ScatterChartRenderer,
  radar: RadarChartRenderer,
};

/**
 * Get the appropriate chart renderer component for a given chart type
 */
export function getChartRenderer(type: ChartType): ChartRenderer {
  const renderer = chartComponents[type];
  
  if (!renderer) {
    console.warn(`Unknown chart type: ${type}, falling back to bar chart`);
    return chartComponents.bar;
  }
  
  return renderer;
}

/**
 * Get all available chart types
 */
export function getAvailableChartTypes(): ChartType[] {
  return Object.keys(chartComponents) as ChartType[];
}

/**
 * Check if a chart type is supported
 */
export function isChartTypeSupported(type: string): type is ChartType {
  return type in chartComponents;
}