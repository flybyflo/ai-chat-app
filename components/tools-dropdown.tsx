'use client';

import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PlusIcon } from './icons';
import type { McpServer } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { Wrench, Bot, Cloud, FileText, TrendingUp, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'integrated' | 'mcp';
  status: 'active' | 'inactive';
  icon?: React.ReactNode;
  serverName?: string;
}

interface ToolsDropdownProps {
  servers: McpServer[];
  onServersChange: (servers: McpServer[]) => void;
  className?: string;
}

export function ToolsDropdown({
  servers,
  onServersChange,
  className,
}: ToolsDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const hiddenTriggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Filter tools based on search query
  const filteredTools = useMemo(() => {
    // Define integrated tools
    const integratedTools: Tool[] = [
      {
        id: 'getWeather',
        name: 'Weather',
        description: 'Get current weather information',
        type: 'integrated',
        status: 'active',
        icon: <MapPin size={14} />,
      },
      {
        id: 'createChart',
        name: 'Charts',
        description: 'Create data visualizations',
        type: 'integrated',
        status: 'active',
        icon: <TrendingUp size={14} />,
      },
      {
        id: 'createDocument',
        name: 'Documents',
        description: 'Create and edit documents',
        type: 'integrated',
        status: 'active',
        icon: <FileText size={14} />,
      },
      {
        id: 'updateDocument',
        name: 'Update Document',
        description: 'Update existing documents',
        type: 'integrated',
        status: 'active',
        icon: <FileText size={14} />,
      },
      {
        id: 'requestSuggestions',
        name: 'Suggestions',
        description: 'Get content suggestions',
        type: 'integrated',
        status: 'active',
        icon: <Bot size={14} />,
      },
    ];

    // Convert MCP servers to tools
    const mcpTools: Tool[] = servers.map((server) => ({
      id: `mcp-${server.id}`,
      name: server.name,
      description: server.description || server.url,
      type: 'mcp',
      status: server.isActive ? 'active' : 'inactive',
      icon: <Cloud size={14} />,
      serverName: server.name,
    }));

    // Combine all tools
    const allTools = [...integratedTools, ...mcpTools];

    return allTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [servers, searchQuery]);

  const activeTools = filteredTools.filter((tool) => tool.status === 'active');

  const handleAddNewClick = () => {
    setDropdownOpen(false);
    // Navigate to MCP settings page
    router.push('?view=mcp-settings', { scroll: false });
  };

  return (
    <>
      <DropdownMenu
        open={dropdownOpen}
        onOpenChange={(open) => {
          setDropdownOpen(open);
          if (!open) {
            // Reset search when dropdown closes
            setSearchQuery('');
          }
        }}
        modal={false}
      >
        <DropdownMenuTrigger asChild>
          <Button
            className={cn(
              'rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200',
              'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
              className,
            )}
            variant="ghost"
          >
            <Wrench size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]" side="top">
          {/* Search Input */}
          <div className="px-2 py-2">
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm w-full"
              onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
            />
          </div>

          {/* Tools List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-default"
              >
                <div className="text-muted-foreground flex-shrink-0">
                  {tool.icon}
                </div>
                <span className="text-sm font-medium flex-1 truncate">
                  {tool.name}
                </span>
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    tool.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
              </div>
            ))}

            {/* No Results */}
            {filteredTools.length === 0 && (
              <DropdownMenuItem
                disabled
                className="text-muted-foreground text-sm"
              >
                {searchQuery
                  ? `No tools match "${searchQuery}"`
                  : 'No tools available'}
              </DropdownMenuItem>
            )}
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400"
            onClick={handleAddNewClick}
          >
            <PlusIcon size={14} />
            Add MCP Server
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
