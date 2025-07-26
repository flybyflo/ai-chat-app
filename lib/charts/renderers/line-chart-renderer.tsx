'use client';

import {
  Line,
  LineChart as RechartsLineChart,
  CartesianGrid,
  XAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartRendererProps } from '../types';

export function LineChartRenderer({ 
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
      <RechartsLineChart
        accessibilityLayer
        data={data}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={(value, name) => [value, '']} />}
        />
        {series.map((serie, index) => (
          <Line
            key={serie.key}
            dataKey={serie.key}
            type={config.options?.curved ? "natural" : "linear"}
            stroke={`var(--color-${serie.key})`}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  );
}