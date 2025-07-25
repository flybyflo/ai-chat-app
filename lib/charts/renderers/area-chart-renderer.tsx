'use client';

import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartRendererProps } from '../types';

export function AreaChartRenderer({ 
  data, 
  config, 
  width = 400, 
  height = 200 
}: ChartRendererProps) {
  const xAxisKey = config.xAxis?.key || Object.keys(data[0] || {})[0];
  const yAxisKey = config.yAxis?.key;
  const series = config.series || (yAxisKey ? [{ key: yAxisKey, label: yAxisKey, color: config.colors?.[0] }] : []);

  return (
    <ResponsiveContainer width={width} height={height}>
      <RechartsAreaChart 
        data={data} 
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        stackOffset={config.options?.stackedArea ? "expand" : undefined}
      >
        {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
        
        <XAxis 
          dataKey={xAxisKey}
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => {
            if (typeof value === 'string' && value.length > 8) {
              return `${value.slice(0, 6)}...`;
            }
            return value;
          }}
        />
        
        {yAxisKey && (
          <YAxis 
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={config.options?.stackedArea ? (value) => `${(value * 100).toFixed(0)}%` : undefined}
          />
        )}
        
        {config.showTooltip && (
          <Tooltip 
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        {config.xAxis?.label || xAxisKey}
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {label}
                      </span>
                    </div>
                    {payload.map((item: any, index: number) => (
                      <div key={`tooltip-${item.dataKey || index}`} className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          {item.name}
                        </span>
                        <span className="font-bold" style={{ color: item.color }}>
                          {config.options?.stackedArea ? 
                            `${(item.value * 100).toFixed(1)}%` : 
                            item.value
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />
        )}
        
        {config.showLegend && series.length > 1 && <Legend />}
        
        {series.map((serie, index) => (
          <Area
            key={serie.key}
            type="monotone"
            dataKey={serie.key}
            stackId={config.options?.stackedArea ? "1" : undefined}
            stroke={serie.color || config.colors?.[index] || `var(--chart-${index + 1})`}
            fill={serie.color || config.colors?.[index] || `var(--chart-${index + 1})`}
            fillOpacity={config.options?.fillOpacity || 0.6}
            strokeWidth={2}
            name={serie.label}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}