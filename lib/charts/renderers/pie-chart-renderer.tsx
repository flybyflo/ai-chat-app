'use client';

import {
  Pie,
  PieChart as RechartsPieChart,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartRendererProps } from '../types';

export function PieChartRenderer({ 
  data, 
  config, 
  width = 400, 
  height = 200 
}: ChartRendererProps) {
  const labelKey = config.xAxis?.key || Object.keys(data[0] || {})[0];
  const valueKey = config.yAxis?.key || Object.keys(data[0] || {})[1];

  // Transform data for pie chart with fill colors
  const pieData = data.map((item, index) => ({
    [labelKey]: item[labelKey],
    [valueKey]: item[valueKey],
    fill: `var(--color-${item[labelKey]})`,
  }));

  // Create chart config for shadcn/ui
  const chartConfig = data.reduce((acc, item, index) => {
    acc[item[labelKey]] = {
      label: item[labelKey],
      color: `var(--chart-${index + 1})`,
    };
    return acc;
  }, {} as any);

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[250px]"
    >
      <RechartsPieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={pieData}
          dataKey={valueKey}
          nameKey={labelKey}
        />
      </RechartsPieChart>
    </ChartContainer>
  );
}