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
        value: z.number(),
        label: z.string(),
      })
      .optional()
      .describe('Trending information to display'),
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
      trend: trend || {
        value: 5.2,
        label: 'this month',
      },
      dataLabel: dataLabel,
    };
  },
});
