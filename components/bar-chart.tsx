'use client';

import { TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  Tooltip,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface ChartConfig {
  [key: string]: {
    label: string;
    color: string;
  };
}

// Custom tooltip content component with simpler typing
export function CustomTooltip({ active, payload, label, dataLabel }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="flex flex-col gap-0.5">
        {payload.map((item: any) => (
          <div
            key={`item-${item.dataKey || String(item.name)}`}
            className="flex items-center gap-2 text-sm"
          >
            <div
              className="size-2 rounded-full"
              style={{ background: item.color }}
            />
            {dataLabel && <span className="font-medium">{dataLabel}:</span>}
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartContainer({
  config,
  children,
}: {
  config: ChartConfig;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <style jsx global>{`
        :root {
          ${Object.entries(config).map(
            ([key, value], i) =>
              `--color-${key}: ${value.color || `var(--chart-${i + 1})`};`,
          )}
        }
      `}</style>
      {children}
    </div>
  );
}

interface BarChartProps {
  data?: Array<Record<string, any>>;
  title?: string;
  description?: string;
  footer?: string;
  trend?: {
    value: number;
    label: string;
  };
  dataLabel?: string;
}

export function BarChart({
  data = [
    { month: 'January', desktop: 186 },
    { month: 'February', desktop: 305 },
    { month: 'March', desktop: 237 },
    { month: 'April', desktop: 73 },
    { month: 'May', desktop: 209 },
    { month: 'June', desktop: 214 },
  ],
  title = 'Bar Chart',
  description = 'January - June 2024',
  footer = 'Showing total visitors for the last 6 months',
  trend = {
    value: 5.2,
    label: 'this month',
  },
  dataLabel,
}: BarChartProps) {
  const chartConfig = {
    desktop: {
      label: dataLabel || '',
      color: 'var(--chart-1)',
    },
  } satisfies ChartConfig;

  return (
    <Card className="max-w-[500px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <RechartsBarChart width={400} height={200} data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <Tooltip
              content={(props) => (
                <CustomTooltip {...props} dataLabel={dataLabel} />
              )}
              cursor={false}
              wrapperStyle={{ outline: 'none' }}
            />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={8} />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by {trend.value}% {trend.label}{' '}
          <TrendingUp className="size-4" />
        </div>
        <div className="text-muted-foreground leading-none">{footer}</div>
      </CardFooter>
    </Card>
  );
}
