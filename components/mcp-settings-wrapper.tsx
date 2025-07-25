'use client';

import { useState, useCallback } from 'react';
import { McpServerSettings } from '@/components/mcp-server-settings';
import { Button } from '@/components/ui/button';
import { ServerIcon } from '@/components/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import type { McpServer } from '@/lib/db/schema';
import { toast } from 'sonner';

interface McpSettingsWrapperProps {
  children: React.ReactNode;
  servers?: McpServer[];
}

export function McpSettingsWrapper({
  children,
  servers = [],
}: McpSettingsWrapperProps) {
  const [mcpServers, setMcpServers] = useState<McpServer[]>(servers);
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const showSettings = view === 'mcp-settings';

  const handleServersChange = useCallback((updatedServers: McpServer[]) => {
    setMcpServers(updatedServers);
  }, []);

  const toggleSettings = () => {
    // Update the URL to reflect the current view
    if (!showSettings) {
      router.push('?view=mcp-settings', { scroll: false });
    } else {
      router.push('/', { scroll: false });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSettings}
          className="flex items-center gap-2"
        >
          <ServerIcon size={16} />
          {showSettings ? 'Back to Chat' : 'MCP Settings'}
        </Button>
        {showSettings && (
          <div className="text-sm text-muted-foreground">
            {mcpServers.length} server{mcpServers.length !== 1 ? 's' : ''}{' '}
            configured
          </div>
        )}
      </div>
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
