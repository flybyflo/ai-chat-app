'use client';

import { useState, useCallback } from 'react';
import { McpServerSettings } from '@/components/mcp-server-settings';
import { useSearchParams } from 'next/navigation';
import type { McpServer } from '@/lib/db/schema';

interface McpSettingsWrapperProps {
  children: React.ReactNode;
  servers?: McpServer[];
}

export function McpSettingsWrapper({
  children,
  servers = [],
}: McpSettingsWrapperProps) {
  const [mcpServers, setMcpServers] = useState<McpServer[]>(servers);
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const showSettings = view === 'mcp-settings';

  const handleServersChange = useCallback((updatedServers: McpServer[]) => {
    setMcpServers(updatedServers);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {showSettings ? (
          <McpServerSettings
            servers={mcpServers}
            onServersChange={handleServersChange}
            className="h-full"
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
