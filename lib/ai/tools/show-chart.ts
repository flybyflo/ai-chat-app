import { tool } from 'ai';
import { z } from 'zod';

export const showChart = tool({
  description: 'Show a bar chart with the provided data',
  parameters: z.object({
    title: z.string().optional().describe('Title of the chart'),
    description: z.string().optional().describe('Description of the chart'),
    data: z
      .array(
        z.object({
          month: z.string(),
          desktop: z.number(),
        }),
      )
      .describe('Data for the chart, with month and desktop value'),
    footer: z.string().optional().describe('Footer text for the chart'),
    trend: z
      .object({
        value: z.number().describe('Trend percentage value'),
        label: z.string().describe('Label for the trend (e.g., "this month")'),
        direction: z
          .enum(['up', 'down', 'none'])
          .optional()
          .describe('Direction of the trend (default: up)'),
      })
      .optional()
      .describe('Trending information to display (omit to hide trend)'),
    dataLabel: z
      .string()
      .optional()
      .describe('Label for the data (set to empty to show just values)'),
  }),
  execute: async ({ title, description, data, footer, trend, dataLabel }) => {
    return {
      title: title || 'Bar Chart',
      description: description || 'Monthly Data',
      data: data || [
        { month: 'January', desktop: 186 },
        { month: 'February', desktop: 305 },
        { month: 'March', desktop: 237 },
        { month: 'April', desktop: 73 },
        { month: 'May', desktop: 209 },
        { month: 'June', desktop: 214 },
      ],
      footer: footer || 'Showing total visitors for the last 6 months',
      trend: trend || null,
      dataLabel: dataLabel,
    };
  },
});
