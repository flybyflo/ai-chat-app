'use client';

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartRendererProps } from '../types';

export function BarChartRenderer({ 
  data, 
  config, 
  width = 400, 
  height = 200 
}: ChartRendererProps) {
  const xAxisKey = config.xAxis?.key || Object.keys(data[0] || {})[0];
  const series = config.series || [];

  // Create chart config for shadcn/ui
  const chartConfig = series.reduce((acc, serie, index) => {
    acc[serie.key] = {
      label: serie.label,
      color: serie.color || `var(--chart-${index + 1})`,
    };
    return acc;
  }, {} as any);

  return (
    <ChartContainer config={chartConfig}>
      <RechartsBarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={(value, name) => [value, '']} />}
        />
        {series.map((serie, index) => (
          <Bar
            key={serie.key}
            dataKey={serie.key}
            fill={`var(--color-${serie.key})`}
            radius={8}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  );
}