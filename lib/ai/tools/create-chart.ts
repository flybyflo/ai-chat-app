import { tool } from 'ai';
import { z } from 'zod';
import { defaultChartConfig, chartTypeMetadata } from '@/lib/charts/types';

// Zod schema for chart data points
const chartDataPointSchema = z.record(z.union([z.string(), z.number()]));

// Zod schema for chart configuration
const chartConfigSchema = z.object({
  xAxis: z.object({
    key: z.string().describe('The data property to use for X-axis'),
    label: z.string().optional().describe('Label for the X-axis'),
    formatter: z.enum(['date', 'number', 'custom']).optional().describe('How to format X-axis values'),
  }).optional(),
  yAxis: z.object({
    key: z.string().describe('The data property to use for Y-axis'),
    label: z.string().optional().describe('Label for the Y-axis'),
    formatter: z.enum(['date', 'number', 'custom']).optional().describe('How to format Y-axis values'),
  }).optional(),
  series: z.array(z.object({
    key: z.string().describe('Data property key for this series'),
    label: z.string().describe('Display label for this series'),
    color: z.string().optional().describe('Custom color for this series'),
  })).optional().describe('Multiple data series configuration'),
  colors: z.array(z.string()).optional().describe('Custom color palette'),
  showGrid: z.boolean().optional().describe('Whether to show grid lines'),
  showLegend: z.boolean().optional().describe('Whether to show legend'),
  showTooltip: z.boolean().optional().describe('Whether to show tooltips'),
  options: z.object({
    barRadius: z.number().optional().describe('Border radius for bar charts'),
    strokeWidth: z.number().optional().describe('Line width for line charts'),
    showDots: z.boolean().optional().describe('Show dots on line charts'),
    curved: z.boolean().optional().describe('Use curved lines'),
    innerRadius: z.number().optional().describe('Inner radius for pie charts'),
    outerRadius: z.number().optional().describe('Outer radius for pie charts'),
    showLabels: z.boolean().optional().describe('Show labels on pie charts'),
    fillOpacity: z.number().optional().describe('Fill opacity for area charts'),
  }).optional().describe('Chart-specific customization options'),
}).optional();

// Trend data schema
const trendSchema = z.object({
  value: z.number().describe('Trend percentage value'),
  label: z.string().describe('Label for the trend (e.g., "this month")'),
  direction: z.enum(['up', 'down', 'none']).optional().describe('Direction of the trend'),
}).optional();

export const createChart = tool({
  description: 'Create charts and graphs to visualize data',
  
  parameters: z.object({
    type: z.enum(['bar', 'line', 'pie', 'area', 'scatter', 'radar']).optional().describe('Chart type (defaults to bar)'),
    title: z.string().optional().describe('Title of the chart'),
    description: z.string().optional().describe('Description of the chart'), 
    data: z.array(z.object({
      month: z.string(),
      desktop: z.number(),
    })).describe('Data for the chart, with month and desktop value'),
    footer: z.string().optional().describe('Footer text for the chart'),
  }),
  
  execute: async ({ type, title, description, data, footer }) => {
    console.log('🎯 createChart tool executed with:', {
      type: type || 'bar',
      title,
      description,
      dataLength: data?.length,
      footer
    });

    return {
      type: type || 'bar',
      title: title || `${type || 'Bar'} Chart`,
      description: description || 'Monthly Data',
      data: data || [
        { month: 'January', desktop: 186 },
        { month: 'February', desktop: 305 },
        { month: 'March', desktop: 237 },
      ],
      footer: footer || `Showing ${data?.length || 3} data points`,
      config: {
        ...defaultChartConfig,
        xAxis: { key: 'month' },
        yAxis: { key: 'desktop' },
        series: [{ key: 'desktop', label: 'Desktop' }]
      },
      trend: null,
    };
  },
});