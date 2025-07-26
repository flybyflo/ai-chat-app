'use client';

import { useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusIcon } from './icons';
import type { McpServer } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import {
  Wrench,
  Bot,
  Cloud,
  FileText,
  TrendingUp,
  MapPin,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToolSettings } from '@/hooks/use-tool-settings';

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
  inline?: boolean;
  onConfigureToggle?: (expanded: boolean) => void;
}

type ViewMode =
  | 'configure'
  | 'integrated-tools'
  | 'mcp-servers'
  | 'mcp-server-details'
  | 'add-mcp-server';

// Inline Tools Configuration Component
export function InlineToolsConfiguration({
  servers,
  onServersChange,
  onClose,
}: {
  servers: McpServer[];
  onServersChange: (servers: McpServer[]) => void;
  onClose: () => void;
}) {
  const [currentView, setCurrentView] = useState<ViewMode>('configure');
  const [selectedServer, setSelectedServer] = useState<McpServer | null>(null);
  const [serverTools, setServerTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();

  const {
    isIntegratedToolEnabled,
    isMcpServerEnabled,
    isMcpToolEnabled,
    toggleIntegratedTool,
    toggleMcpServer,
    toggleMcpTool,
    enableAllIntegratedTools,
    disableAllIntegratedTools,
    enableAllMcpServers,
    disableAllMcpServers,
    enableAllToolsForServer,
    disableAllToolsForServer,
    getEnabledCounts,
  } = useToolSettings();

  interface McpServerForm {
    name: string;
    url: string;
    apiKey: string;
    description: string;
    isActive: boolean;
  }

  const form = useForm<McpServerForm>({
    defaultValues: {
      name: '',
      url: '',
      apiKey: '',
      description: '',
      isActive: true,
    },
  });

  const handleAddNewClick = () => {
    setCurrentView('add-mcp-server');
    setSearchQuery('');
    form.reset();
  };

  const handleBackToMcpServers = () => {
    setCurrentView('mcp-servers');
    setSelectedServer(null);
    setServerTools([]);
    setSearchQuery('');
  };

  const onSubmit = async (data: McpServerForm) => {
    // Basic validation
    if (!data.name?.trim()) {
      return;
    }
    if (!data.url?.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/mcp-servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name.trim(),
          url: data.url.trim(),
          apiKey: data.apiKey?.trim() || null,
          description: data.description?.trim() || null,
          isActive: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create server');
      }

      const newServer = await response.json();
      onServersChange([...servers, newServer]);

      // Reset form and go back to servers list
      form.reset();
      setCurrentView('mcp-servers');
    } catch (error) {
      console.error('Error creating server:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewIntegratedTools = () => {
    setCurrentView('integrated-tools');
    setSearchQuery('');
  };

  const handleViewMcpServers = () => {
    setCurrentView('mcp-servers');
    setSearchQuery('');
  };

  const handleBackToConfigure = () => {
    setCurrentView('configure');
    setSearchQuery('');
  };

  const handleViewServerDetails = async (server: McpServer) => {
    setSelectedServer(server);
    setCurrentView('mcp-server-details');
    setSearchQuery('');

    setLoadingTools(true);
    try {
      const response = await fetch(`/api/mcp-servers/${server.id}/tools`);
      if (response.ok) {
        const data = await response.json();
        setServerTools(data.tools || []);
      } else {
        setServerTools([]);
      }
    } catch (error) {
      console.error('Failed to fetch server tools:', error);
      setServerTools([]);
    } finally {
      setLoadingTools(false);
    }
  };

  const handleDeleteServer = (serverId: string, serverName: string) => {
    setServerToDelete({ id: serverId, name: serverName });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteServer = async () => {
    if (!serverToDelete) return;

    try {
      const response = await fetch(`/api/mcp-servers/${serverToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete server');
      }

      // Update the servers list
      const updatedServers = servers.filter(s => s.id !== serverToDelete.id);
      onServersChange(updatedServers);
    } catch (error) {
      console.error('Error deleting server:', error);
    } finally {
      setDeleteDialogOpen(false);
      setServerToDelete(null);
    }
  };

  const filteredTools = useMemo(() => {
    const integratedTools: Tool[] = [
      {
        id: 'getWeather',
        name: 'Weather',
        description: 'Get current weather information',
        type: 'integrated',
        status: isIntegratedToolEnabled('getWeather') ? 'active' : 'inactive',
        icon: <MapPin size={14} />,
      },
      {
        id: 'createChart',
        name: 'Charts',
        description: 'Create data visualizations',
        type: 'integrated',
        status: isIntegratedToolEnabled('createChart') ? 'active' : 'inactive',
        icon: <TrendingUp size={14} />,
      },
      {
        id: 'createDocument',
        name: 'Documents',
        description: 'Create and edit documents',
        type: 'integrated',
        status: isIntegratedToolEnabled('createDocument')
          ? 'active'
          : 'inactive',
        icon: <FileText size={14} />,
      },
      {
        id: 'updateDocument',
        name: 'Update Document',
        description: 'Update existing documents',
        type: 'integrated',
        status: isIntegratedToolEnabled('updateDocument')
          ? 'active'
          : 'inactive',
        icon: <FileText size={14} />,
      },
      {
        id: 'requestSuggestions',
        name: 'Suggestions',
        description: 'Get content suggestions',
        type: 'integrated',
        status: isIntegratedToolEnabled('requestSuggestions')
          ? 'active'
          : 'inactive',
        icon: <Bot size={14} />,
      },
    ];

    const mcpTools: Tool[] = servers.map((server) => ({
      id: `mcp-${server.id}`,
      name: server.name,
      description: server.description || server.url,
      type: 'mcp',
      status:
        server.isActive && isMcpServerEnabled(server.id)
          ? 'active'
          : 'inactive',
      icon: <Cloud size={14} />,
      serverName: server.name,
    }));

    const allTools = [...integratedTools, ...mcpTools];

    return allTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [servers, searchQuery, isIntegratedToolEnabled, isMcpServerEnabled]);

  return (
    <div className="size-full flex flex-col space-y-4">
      {currentView === 'configure' ? (
        // Configure View
        <>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 rounded-lg bg-transparent"
            >
              <ArrowLeft size={14} />
            </Button>
            <div className="flex-1">
              <div className="text-sm font-medium">Configure Tools</div>
              <div className="text-xs text-muted-foreground">
                Manage integrated tools and MCP servers
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-between p-3 bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer rounded-xl border border-input"
              onClick={handleViewIntegratedTools}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                  <Bot size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">Integrated Tools</div>
                  <div className="text-xs text-muted-foreground">
                    Built-in tools ({getEnabledCounts().integratedTools.enabled}{' '}
                    of {getEnabledCounts().integratedTools.total} enabled)
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-between p-3 bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer rounded-xl border border-input"
              onClick={handleViewMcpServers}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                  <Cloud
                    size={16}
                    className="text-green-600 dark:text-green-400"
                  />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">MCP Servers</div>
                  <div className="text-xs text-muted-foreground">
                    External tools (
                    {
                      servers.filter(
                        (s) => s.isActive && isMcpServerEnabled(s.id),
                      ).length
                    }{' '}
                    enabled, {servers.length} total)
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        </>
      ) : currentView === 'integrated-tools' ? (
        // Integrated Tools View
        <>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="size-8 p-0 rounded-lg bg-transparent"
              onClick={handleBackToConfigure}
            >
              <ArrowLeft size={14} />
            </Button>
            <Input
              placeholder="Search integrated tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-8 text-sm bg-transparent border border-input rounded-lg"
            />
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs px-2 h-8 bg-transparent"
                onClick={enableAllIntegratedTools}
              >
                Enable All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs px-2 h-8 bg-transparent"
                onClick={disableAllIntegratedTools}
              >
                Disable All
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[280px] [&>[data-radix-scroll-area-scrollbar]]:hidden">
            <div className="space-y-2 pr-4 overflow-x-hidden">
              {filteredTools
                .filter(
                  (tool) =>
                    tool.type === 'integrated' &&
                    (!searchQuery ||
                      tool.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())),
                )
                .map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center gap-3 p-2 bg-transparent border border-input rounded-lg min-w-0"
                  >
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="text-sm font-medium truncate">
                        {tool.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {tool.description.length > 80
                          ? `${tool.description.slice(0, 80)}...`
                          : tool.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={tool.status === 'active'}
                        onCheckedChange={() => toggleIntegratedTool(tool.id)}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </>
      ) : currentView === 'mcp-servers' ? (
        // MCP Servers View
        <>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="size-8 p-0 rounded-lg bg-transparent"
              onClick={handleBackToConfigure}
            >
              <ArrowLeft size={14} />
            </Button>
            <Input
              placeholder="Search MCP servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-8 text-sm bg-transparent border border-input rounded-lg"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-blue-600 dark:text-blue-400 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-950/20"
              onClick={handleAddNewClick}
            >
              <PlusIcon size={14} />
              <span className="ml-1 text-xs">Add</span>
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {servers
              .filter(
                (server) =>
                  !searchQuery ||
                  server.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  server.description
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()),
              )
              .map((server) => (
                <div
                  key={server.id}
                  className="w-full flex items-center gap-3 p-3 bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl border border-input"
                >
                  <Cloud size={16} className="text-muted-foreground shrink-0" />
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleViewServerDetails(server)}
                  >
                    <div className="text-sm font-medium truncate">
                      {server.name}
                    </div>
                    {server.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {server.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={server.isActive && isMcpServerEnabled(server.id)}
                      onCheckedChange={() => {
                        if (server.isActive) {
                          // Only toggle our internal setting if server is already active
                          toggleMcpServer(server.id);
                        }
                      }}
                      disabled={!server.isActive}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteServer(server.id, server.name);
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                      title="Delete server"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewServerDetails(server)}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                    >
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </>
      ) : currentView === 'mcp-server-details' && selectedServer ? (
        // Server Details View
        <div className="flex flex-col h-full space-y-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="size-8 p-0 rounded-lg bg-transparent"
              onClick={handleBackToMcpServers}
            >
              <ArrowLeft size={14} />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium truncate">
                    {selectedServer.name}
                  </div>
                  <Badge
                    variant={selectedServer.isActive && isMcpServerEnabled(selectedServer.id) ? 'default' : 'secondary'}
                    className="text-xs px-1.5 py-0"
                  >
                    {selectedServer.isActive && isMcpServerEnabled(selectedServer.id) ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate flex-1 text-center mx-4">
                  {selectedServer.url}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {serverTools.length} tools
                </div>
              </div>
            </div>
          </div>

          {selectedServer.description && (
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Description
              </div>
              <div className="text-sm">{selectedServer.description}</div>
            </div>
          )}

          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Available Tools</div>
              {serverTools.length > 0 && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 h-6 bg-transparent"
                    onClick={() =>
                      selectedServer &&
                      enableAllToolsForServer(
                        selectedServer.id,
                        serverTools.map((t) => t.name),
                      )
                    }
                  >
                    Enable All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 h-6 bg-transparent"
                    onClick={() =>
                      selectedServer &&
                      disableAllToolsForServer(
                        selectedServer.id,
                        serverTools.map((t) => t.name),
                      )
                    }
                  >
                    Disable All
                  </Button>
                </div>
              )}
            </div>
            {loadingTools ? (
              <div className="flex items-center justify-center p-6">
                <Loader2
                  size={16}
                  className="animate-spin text-muted-foreground"
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading tools...
                </span>
              </div>
            ) : serverTools.length > 0 ? (
              <ScrollArea className="h-[280px] [&>[data-radix-scroll-area-scrollbar]]:hidden">
                <div className="space-y-2 pr-4 overflow-x-hidden">
                  {serverTools.map((tool, index) => (
                    <div
                      key={`${tool.name}-${index}`}
                      className="flex items-center gap-3 p-2 bg-transparent border border-input rounded-lg min-w-0"
                    >
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="text-sm font-medium truncate">
                          {tool.name}
                        </div>
                        {tool.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {tool.description.length > 80
                              ? `${tool.description.slice(0, 80)}...`
                              : tool.description}
                            {tool.parameters &&
                              Object.keys(tool.parameters).length > 0 && (
                                <span className="ml-1">
                                  ({Object.keys(tool.parameters).length}{' '}
                                  parameters)
                                </span>
                              )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={
                            selectedServer
                              ? isMcpToolEnabled(selectedServer.id, tool.name)
                              : false
                          }
                          onCheckedChange={() =>
                            selectedServer &&
                            toggleMcpTool(selectedServer.id, tool.name)
                          }
                          disabled={
                            !selectedServer?.isActive ||
                            !isMcpServerEnabled(selectedServer?.id || '')
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center p-4 text-sm text-muted-foreground">
                No tools available or unable to fetch tools from this server
              </div>
            )}
          </div>
        </div>
      ) : currentView === 'add-mcp-server' ? (
        // Add MCP Server View
        <>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="size-8 p-0 rounded-lg bg-transparent"
              onClick={handleBackToMcpServers}
            >
              <ArrowLeft size={14} />
            </Button>
            <div className="flex-1">
              <div className="text-sm font-medium">Add New MCP Server</div>
              <div className="text-xs text-muted-foreground">
                Configure a new MCP server to extend your AI assistant
                capabilities
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-3">
              <Input
                placeholder="Server Name"
                className="h-9 text-sm bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg"
                {...form.register('name', { required: true })}
              />

              <Input
                placeholder="Server URL (e.g., http://localhost:8000/sse/)"
                className="h-9 text-sm bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg"
                {...form.register('url', { required: true })}
              />

              <Input
                type="password"
                placeholder="API Key (optional)"
                className="h-9 text-sm bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg"
                {...form.register('apiKey')}
              />

              <Textarea
                placeholder="Description (optional)"
                className="min-h-[60px] text-sm bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg resize-none"
                {...form.register('description')}
              />
            </div>

            <Button
              type="button"
              disabled={isSubmitting}
              className="w-full h-9"
              onClick={form.handleSubmit(onSubmit)}
            >
              {isSubmitting ? 'Adding...' : 'Add Server'}
            </Button>
          </div>
        </>
      ) : null}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete MCP Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{serverToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteServer}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ToolsDropdown({
  servers,
  onServersChange,
  className,
  inline = false,
  onConfigureToggle,
}: ToolsDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<ViewMode>('configure');
  const [selectedServer, setSelectedServer] = useState<McpServer | null>(null);
  const [serverTools, setServerTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
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
    if (inline) {
      onConfigureToggle?.(false);
    } else {
      setDropdownOpen(false);
    }
    // Navigate to MCP settings page
    router.push('/settings');
  };

  const handleConfigureClick = () => {
    if (inline) {
      onConfigureToggle?.(true);
    } else {
      setDropdownOpen(true);
    }
  };

  const handleViewIntegratedTools = () => {
    setCurrentView('integrated-tools');
    setSearchQuery(''); // Reset search when switching views
  };

  const handleViewMcpServers = () => {
    setCurrentView('mcp-servers');
    setSearchQuery(''); // Reset search when switching views
  };

  const handleBackToConfigure = () => {
    setCurrentView('configure');
    setSearchQuery(''); // Reset search when switching views
  };

  const handleBackToMcpServers = () => {
    setCurrentView('mcp-servers');
    setSelectedServer(null);
    setServerTools([]);
    setSearchQuery(''); // Reset search when switching views
  };

  const handleViewServerDetails = async (server: McpServer) => {
    setSelectedServer(server);
    setCurrentView('mcp-server-details');
    setSearchQuery('');

    // Fetch tools for this server
    setLoadingTools(true);
    try {
      const response = await fetch(`/api/mcp-servers/${server.id}/tools`);
      if (response.ok) {
        const data = await response.json();
        setServerTools(data.tools || []);
      } else {
        setServerTools([]);
      }
    } catch (error) {
      console.error('Failed to fetch server tools:', error);
      setServerTools([]);
    } finally {
      setLoadingTools(false);
    }
  };

  const resetView = () => {
    setCurrentView('configure');
    setSearchQuery('');
    setSelectedServer(null);
    setServerTools([]);
  };

  // If inline mode, return just the button
  if (inline) {
    return (
      <Button
        className={cn(
          'rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200 bg-transparent',
          className,
        )}
        variant="outline"
        onClick={handleConfigureClick}
      >
        <Wrench size={14} />
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu
        open={dropdownOpen}
        onOpenChange={(open) => {
          setDropdownOpen(open);
          if (!open) {
            // Reset search and view when dropdown closes
            resetView();
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
        <DropdownMenuContent
          align="start"
          className="w-[320px] p-0 rounded-2xl bg-muted dark:border-zinc-700"
          side="top"
        >
          {currentView === 'configure' ? (
            // Configure View - Navigation to tool categories
            <>
              {/* Header */}
              <div className="border-b border-border/50 p-4 rounded-t-2xl">
                <div className="text-sm font-medium">Configure Tools</div>
                <div className="text-xs text-muted-foreground">
                  Manage integrated tools and MCP servers
                </div>
              </div>

              {/* Navigation Options */}
              <div className="p-4 space-y-3">
                {/* Integrated Tools */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer rounded-xl border dark:border-zinc-700"
                  onClick={handleViewIntegratedTools}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                      <Bot
                        size={16}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">
                        Integrated Tools
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Built-in tools (
                        {
                          filteredTools.filter((t) => t.type === 'integrated')
                            .length
                        }{' '}
                        available)
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>

                {/* MCP Servers */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer rounded-xl border dark:border-zinc-700"
                  onClick={handleViewMcpServers}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                      <Cloud
                        size={16}
                        className="text-green-600 dark:text-green-400"
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">MCP Servers</div>
                      <div className="text-xs text-muted-foreground">
                        External tools (
                        {servers.filter((s) => s.isActive).length} active,{' '}
                        {servers.length} total)
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </div>

              {/* Footer */}
              <DropdownMenuSeparator className="bg-border/30" />
              <div className="p-4 rounded-b-2xl">
                <DropdownMenuItem
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 rounded-lg"
                  onClick={handleAddNewClick}
                >
                  <PlusIcon size={14} />
                  Add MCP Server
                </DropdownMenuItem>
              </div>
            </>
          ) : currentView === 'integrated-tools' ? (
            // Integrated Tools View
            <>
              {/* Header with Back Button */}
              <div className="flex items-center border-b border-border/50 p-4 rounded-t-2xl">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 mr-2 rounded-lg"
                  onClick={handleBackToConfigure}
                >
                  <ArrowLeft size={14} />
                </Button>
                <div className="text-sm font-medium">Integrated Tools</div>
              </div>

              {/* Search Input - Full Width */}
              <div className="border-b border-border/50">
                <Input
                  placeholder="Search integrated tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Tools List */}
              <div className="max-h-80 overflow-y-auto p-4">
                {filteredTools
                  .filter(
                    (tool) =>
                      tool.type === 'integrated' &&
                      (!searchQuery ||
                        tool.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())),
                  )
                  .map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-default rounded-xl border-b dark:border-zinc-700 last:border-0"
                    >
                      <div className="text-muted-foreground shrink-0">
                        {tool.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {tool.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {tool.description}
                        </div>
                      </div>
                      <div className="size-2 rounded-full shrink-0 bg-green-500" />
                    </div>
                  ))}

                {filteredTools.filter(
                  (tool) =>
                    tool.type === 'integrated' &&
                    (!searchQuery ||
                      tool.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())),
                ).length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    {searchQuery
                      ? `No tools match &quot;${searchQuery}&quot;`
                      : 'No integrated tools available'}
                  </div>
                )}
              </div>
            </>
          ) : (
            // MCP Servers View
            <>
              {/* Header with Back Button */}
              <div className="flex items-center border-b border-border/50 p-4 rounded-t-2xl">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 mr-2 rounded-lg"
                  onClick={handleBackToConfigure}
                >
                  <ArrowLeft size={14} />
                </Button>
                <div className="text-sm font-medium">MCP Servers</div>
              </div>

              {/* Search Input - Full Width */}
              <div className="border-b border-border/50">
                <Input
                  placeholder="Search MCP servers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* MCP Servers List */}
              <div className="max-h-80 overflow-y-auto p-4">
                {servers
                  .filter(
                    (server) =>
                      !searchQuery ||
                      server.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      server.description
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                  )
                  .map((server) => (
                    <button
                      key={server.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer rounded-xl border-b dark:border-zinc-700 last:border-0 text-left"
                      onClick={() => handleViewServerDetails(server)}
                    >
                      <Cloud
                        size={16}
                        className="text-muted-foreground shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {server.name}
                        </div>
                        {server.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {server.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`size-2 rounded-full shrink-0 ${
                            server.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        <ChevronRight
                          size={14}
                          className="text-muted-foreground"
                        />
                      </div>
                    </button>
                  ))}

                {servers.filter(
                  (server) =>
                    !searchQuery ||
                    server.name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    server.description
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                ).length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    {searchQuery
                      ? `No servers match &quot;${searchQuery}&quot;`
                      : 'No MCP servers configured'}
                  </div>
                )}
              </div>

              {/* Footer */}
              <DropdownMenuSeparator className="bg-border/30" />
              <div className="p-4 rounded-b-2xl">
                <DropdownMenuItem
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 rounded-lg"
                  onClick={handleAddNewClick}
                >
                  <PlusIcon size={14} />
                  Add MCP Server
                </DropdownMenuItem>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
