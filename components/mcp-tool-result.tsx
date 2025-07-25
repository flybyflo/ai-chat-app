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
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Extract display result for inline preview
  const getDisplayResult = () => {
    if (typeof result === 'object' && result !== null) {
      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join(' ');
        return textContent || 'No result';
      }
      if (result.structuredContent?.result !== undefined) {
        return String(result.structuredContent.result);
      }
      if (result.isError) {
        return `Error: ${result.content?.[0]?.text || 'Unknown error'}`;
      }
    }
    return result ? String(result) : 'No result';
  };

  return (
    <motion.div
      className={cn(
        'rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 my-2 shadow-sm',
        'cursor-pointer hover:shadow-md transition-shadow',
        className,
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => state === 'result' && setIsExpanded(!isExpanded)}
    >
      {/* Compact Tool Call Header */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <code className="text-xs font-mono text-foreground bg-white/60 dark:bg-black/20 px-2 py-1 rounded border">
              {headingText}
            </code>
            {state === 'call' && (
              <motion.div
                className="size-3 border-2 border-current border-t-transparent rounded-full text-muted-foreground"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'linear',
                }}
              />
            )}
          </div>
          {state === 'result' && showResult && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-green-700 dark:text-green-400 truncate max-w-32">
                {getDisplayResult()}
              </span>
              <motion.div
                className="text-muted-foreground"
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Result Section - Only show when clicked and expanded */}
      <AnimatePresence>
        {state === 'result' && showResult && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="border-t border-white/20"
          >
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-2 rounded-full bg-green-500" />
                <h4 className="text-xs font-semibold text-green-700 dark:text-green-400">
                  Full Result
                </h4>
              </div>

              <motion.div
                className="bg-white dark:bg-slate-900 rounded-md p-3 border shadow-inner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
              {(() => {
                // Extract meaningful content from MCP result structure
                if (typeof result === 'object' && result !== null) {
                  // Handle MCP result structure with content array
                  if (result.content && Array.isArray(result.content)) {
                    const textContent = result.content
                      .filter((item: any) => item.type === 'text')
                      .map((item: any) => item.text)
                      .join('\n');
                    
                    if (textContent) {
                      return (
                        <div className="text-sm font-mono text-foreground">
                          <span className="text-green-800 dark:text-green-300">
                            {textContent}
                          </span>
                        </div>
                      );
                    }
                  }
                  
                  // Handle structured content with result field
                  if (result.structuredContent && result.structuredContent.result !== undefined) {
                    return (
                      <div className="text-sm font-mono text-foreground">
                        <span className="text-green-800 dark:text-green-300">
                          {String(result.structuredContent.result)}
                        </span>
                      </div>
                    );
                  }
                  
                  // Show error state if isError is true
                  if (result.isError) {
                    return (
                      <div className="text-sm font-mono text-foreground">
                        <span className="text-red-800 dark:text-red-300">
                          Error: {result.content?.[0]?.text || 'Unknown error'}
                        </span>
                      </div>
                    );
                  }
                  
                  // Fallback to JSON for unknown object structures
                  return (
                    <pre className="text-xs overflow-x-auto text-foreground font-mono">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  );
                }
                
                // Handle non-object results
                return (
                  <div className="text-sm font-mono text-foreground">
                    <span className="text-green-800 dark:text-green-300">
                      {String(result)}
                    </span>
                  </div>
                );
              })()}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export { MCPToolResult };
