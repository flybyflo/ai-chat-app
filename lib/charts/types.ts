// Chart type definitions and interfaces

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar';

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface ChartConfiguration {
  // Axis configuration
  xAxis?: {
    key: string;
    label?: string;
    formatter?: string; // 'date' | 'number' | 'custom'
  };
  yAxis?: {
    key: string;
    label?: string;
    formatter?: string;
  };
  
  // Data series configuration
  series?: Array<{
    key: string;
    label: string;
    color?: string;
  }>;
  
  // Visual customization
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  
  // Chart-specific options
  options?: {
    // Bar chart options
    barRadius?: number;
    barGap?: number;
    
    // Line chart options
    strokeWidth?: number;
    showDots?: boolean;
    curved?: boolean;
    
    // Pie chart options
    innerRadius?: number;
    outerRadius?: number;
    showLabels?: boolean;
    
    // Area chart options
    fillOpacity?: number;
    stackedArea?: boolean;
  };
}

export interface TrendData {
  value: number;
  label: string;
  direction?: 'up' | 'down' | 'none';
}

export interface ChartProps {
  type: ChartType;
  data: ChartDataPoint[];
  config: ChartConfiguration;
  title?: string;
  description?: string;
  footer?: string;
  trend?: TrendData | null;
}

export interface ChartRendererProps {
  data: ChartDataPoint[];
  config: ChartConfiguration;
  width?: number;
  height?: number;
}

// Default chart configuration
export const defaultChartConfig: ChartConfiguration = {
  showGrid: true,
  showLegend: true,
  showTooltip: true,
  colors: [
    'var(--chart-1)',
    'var(--chart-2)', 
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ],
  options: {
    barRadius: 8,
    strokeWidth: 2,
    showDots: true,
    curved: false,
    innerRadius: 0,
    outerRadius: 100,
    showLabels: true,
    fillOpacity: 0.6,
  },
};

// Chart type metadata for AI tool
export const chartTypeMetadata = {
  bar: {
    name: 'Bar Chart',
    description: 'Compare values across categories with vertical bars',
    example: 'Sales by month, revenue by region',
  },
  line: {
    name: 'Line Chart', 
    description: 'Show trends and changes over time',
    example: 'Stock prices, temperature over time',
  },
  pie: {
    name: 'Pie Chart',
    description: 'Show proportions and percentages of a whole',
    example: 'Market share, budget breakdown',
  },
  area: {
    name: 'Area Chart',
    description: 'Display quantitative data over time with filled areas',
    example: 'Website traffic, cumulative sales',
  },
  scatter: {
    name: 'Scatter Plot',
    description: 'Show correlation between two variables',
    example: 'Height vs weight, price vs quality',
  },
  radar: {
    name: 'Radar Chart',
    description: 'Compare multiple variables in a circular format',
    example: 'Skill assessments, product comparisons',
  },
} as const;