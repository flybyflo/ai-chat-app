'use client';

import {
  Scatter,
  ScatterChart as RechartsScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartRendererProps } from '../types';

export function ScatterChartRenderer({ 
  data, 
  config, 
  width = 400, 
  height = 200 
}: ChartRendererProps) {
  const xAxisKey = config.xAxis?.key || Object.keys(data[0] || {})[0];
  const yAxisKey = config.yAxis?.key || Object.keys(data[0] || {})[1];
  const series = config.series || [{ key: 'default', label: 'Data Points', color: config.colors?.[0] }];

  // Transform data for scatter chart
  const scatterData = series.map((serie, index) => ({
    name: serie.label,
    data: data.map(item => ({
      x: item[xAxisKey],
      y: item[yAxisKey],
      z: item[serie.key] || 1, // Z for size if available
    })),
    fill: serie.color || config.colors?.[index] || `var(--chart-${index + 1})`,
  }));

  return (
    <ResponsiveContainer width={width} height={height}>
      <RechartsScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
        
        <XAxis 
          type="number"
          dataKey="x"
          name={config.xAxis?.label || xAxisKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        
        <YAxis 
          type="number"
          dataKey="y"
          name={config.yAxis?.label || yAxisKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        
        {config.showTooltip && (
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              
              const data = payload[0].payload;
              
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        {config.xAxis?.label || xAxisKey}
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {data.x}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        {config.yAxis?.label || yAxisKey}
                      </span>
                      <span className="font-bold">
                        {data.y}
                      </span>
                    </div>
                    {data.z !== 1 && (
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Size
                        </span>
                        <span className="font-bold">
                          {data.z}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
        )}
        
        {config.showLegend && scatterData.length > 1 && <Legend />}
        
        {scatterData.map((dataset, index) => (
          <Scatter
            key={dataset.name}
            name={dataset.name}
            data={dataset.data}
            fill={dataset.fill}
          />
        ))}
      </RechartsScatterChart>
    </ResponsiveContainer>
  );
}