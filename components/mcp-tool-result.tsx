'use client';

import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MCPToolResultProps {
  toolName: string;
  args: Record<string, any>;
  result?: any;
  state: 'call' | 'result';
  className?: string;
  serverName?: string;
}

const MCPToolResult = memo(function MCPToolResult({
  toolName,
  args,
  result,
  state,
  className,
  serverName = 'unknown',
}: MCPToolResultProps) {
  const [showResult, setShowResult] = useState(false);

  // Show result with a slight delay for better UX
  useEffect(() => {
    if (state === 'result') {
      const timer = setTimeout(() => setShowResult(true), 300);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Format parameters for display in heading
  const formatParameters = (args: Record<string, any>): string => {
    if (!args || Object.keys(args).length === 0) {
      return '()';
    }

    const paramStrings = Object.entries(args).map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}="${value}"`;
      } else if (typeof value === 'object') {
        return `${key}=${JSON.stringify(value)}`;
      } else {
        return `${key}=${value}`;
      }
    });

    return `(${paramStrings.join(', ')})`;
  };

  // Create the new heading format
  const headingText = `mcp::${serverName || 'unknown'}::${toolName}${formatParameters(args)}`;

  return (
    <motion.div
      className={cn(
        'rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 my-3 shadow-sm',
        className,
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Tool Call Header */}
      <motion.div
        className="mb-3"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            <code className="px-2 py-1 rounded-md bg-white/60 dark:bg-black/20 text-xs font-mono border">
              {headingText}
            </code>
          </h3>
          {state === 'call' && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <motion.div
                className="size-3 border-2 border-current border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'linear',
                }}
              />
              Executing...
            </div>
          )}
        </div>
      </motion.div>

      {/* Result Section - Only show when state is 'result' */}
      <AnimatePresence>
        {state === 'result' && showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="border-t border-white/20 pt-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <h4 className="text-xs font-semibold text-green-700 dark:text-green-400">
                Result
              </h4>
            </div>

            <motion.div
              className="bg-white dark:bg-slate-900 rounded-lg p-4 border shadow-inner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {typeof result === 'object' ? (
                <pre className="text-sm overflow-x-auto text-foreground font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <div className="text-sm font-mono text-foreground bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 px-3 py-2 rounded border">
                  <span className="font-semibold text-green-800 dark:text-green-300">
                    {String(result)}
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export { MCPToolResult };
