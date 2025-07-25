'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useState, memo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ChartProps } from '@/lib/charts/types';
import { getChartRenderer } from '@/lib/charts/chart-registry';

// Removed - using shadcn/ui ChartContainer instead

const UniversalChart = memo(function UniversalChart({
  type,
  data,
  config,
  title = 'Chart',
  description = 'Data visualization',
  footer = 'Chart footer',
  trend = null,
}: ChartProps) {
  // Use client-side rendering to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get the appropriate chart renderer
  const ChartRenderer = getChartRenderer(type);

  // console.log('🎨 Chart renderer found:', !!ChartRenderer, 'for type:', type);

  return (
    <Card className="max-w-[500px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        {isMounted ? (
            (() => {
              if (!ChartRenderer) {
                console.error('❌ No chart renderer found for type:', type);
                return (
                  <div className="w-[400px] h-[200px] flex items-center justify-center bg-muted rounded-lg border border-red-200">
                    <div className="text-sm text-red-600">Chart renderer not found for type: {type}</div>
                  </div>
                );
              }
              
              if (!data || data.length === 0) {
                return (
                  <div className="w-[400px] h-[200px] flex items-center justify-center bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Loading chart data...</div>
                  </div>
                );
              }

              // console.log('✅ Rendering chart with renderer:', ChartRenderer.name || 'Unknown');
              
              try {
                return (
                  <ChartRenderer
                    data={data}
                    config={config}
                    width={400}
                    height={200}
                  />
                );
              } catch (error) {
                console.error('❌ Error rendering chart:', error);
                return (
                  <div className="w-[400px] h-[200px] flex items-center justify-center bg-muted rounded-lg border border-red-200">
                    <div className="text-sm text-red-600">Error rendering chart: {error instanceof Error ? error.message : 'Unknown error'}</div>
                  </div>
                );
              }
            })()
        ) : (
          <div className="w-[400px] h-[200px] flex items-center justify-center bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Loading chart...</div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {trend && (
          <div className="flex gap-2 leading-none font-medium">
            {trend.direction !== 'down' ? (
              <>
                Trending up by {trend.value}% {trend.label}{' '}
                <TrendingUp className="size-4" />
              </>
            ) : (
              <>
                Trending down by {trend.value}% {trend.label}{' '}
                <TrendingDown className="size-4" />
              </>
            )}
          </div>
        )}
        <div className="text-muted-foreground leading-none">{footer}</div>
      </CardFooter>
    </Card>
  );
});

export { UniversalChart };