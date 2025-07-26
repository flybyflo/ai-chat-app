'use client';

import { useState, useEffect } from 'react';
import { McpServerSettings } from '@/components/mcp-server-settings';
import type { McpServer } from '@/lib/db/schema';

export default function SettingsPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServers() {
      try {
        const response = await fetch('/api/mcp-servers');
        if (response.ok) {
          const data = await response.json();
          setServers(data);
        }
      } catch (error) {
        console.error('Failed to fetch servers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchServers();
  }, []);

  const handleServersChange = (updatedServers: McpServer[]) => {
    setServers(updatedServers);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <McpServerSettings
          servers={servers}
          onServersChange={handleServersChange}
          className="h-full"
        />
      </div>
    </div>
  );
}