'use client';

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { ChartRendererProps } from '../types';

export function RadarChartRenderer({ 
  data, 
  config, 
  width = 400, 
  height = 200 
}: ChartRendererProps) {
  const series = config.series || [];
  
  // For radar charts, we need to identify the "subject" key (what we're measuring)
  // and the metric keys (the different dimensions being measured)
  const subjectKey = config.xAxis?.key || Object.keys(data[0] || {})[0];

  return (
    <ResponsiveContainer width={width} height={height}>
      <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        
        <PolarAngleAxis 
          dataKey={subjectKey}
          tick={{ fontSize: 12 }}
        />
        
        <PolarRadiusAxis 
          angle={30}
          domain={[0, 'dataMax']}
          tick={{ fontSize: 10 }}
          tickCount={4}
        />
        
        {config.showTooltip && (
          <Tooltip 
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Category
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
                          {item.value}
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
          <Radar
            key={serie.key}
            name={serie.label}
            dataKey={serie.key}
            stroke={serie.color || config.colors?.[index] || `var(--chart-${index + 1})`}
            fill={serie.color || config.colors?.[index] || `var(--chart-${index + 1})`}
            fillOpacity={config.options?.fillOpacity || 0.3}
            strokeWidth={2}
          />
        ))}
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}