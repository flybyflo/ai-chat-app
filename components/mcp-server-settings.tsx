'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CodeIcon, } from './icons';
import { Badge } from '@/components/ui/badge';
import type { McpServer } from '@/lib/db/schema';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Loader2, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';

const mcpServerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  url: z.string().url('Must be a valid URL'),
  apiKey: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type McpServerForm = z.infer<typeof mcpServerSchema>;

interface ServerHealthStatus {
  status: 'online' | 'offline' | 'error' | 'timeout' | 'checking';
  responseTime?: number;
  statusCode?: number | null;
  message?: string;
  tools?: any[];
  lastChecked?: Date;
}

interface McpServerSettingsProps {
  servers?: McpServer[];
  onServersChange?: (servers: McpServer[]) => void;
  className?: string;
}

// Define schema for the unified table (servers and tools)
const unifiedTableSchema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.union([z.string(), z.number()]),
  reviewer: z.string(),
  serverId: z.string().optional(),
  healthStatus: z.object({
    status: z.enum(['online', 'offline', 'error', 'timeout', 'checking']),
    responseTime: z.number().optional(),
    statusCode: z.number().nullable().optional(),
    message: z.string().optional(),
    lastChecked: z.date().optional(),
  }).optional(),
});

type UnifiedTableData = z.infer<typeof unifiedTableSchema>;

// Status component with dropdown and health indicators
function StatusCell({ 
  item, 
  onToggle,
  onTestConnection 
}: { 
  item: UnifiedTableData; 
  onToggle: (id: number, newStatus: boolean) => void;
  onTestConnection?: (serverId: string) => void;
}) {
  const isActive = item.status === 'Active';
  const canToggle = item.type === 'MCP Server'; // Only servers can be toggled
  const healthStatus = item.healthStatus;
  
  const getHealthIcon = () => {
    if (!healthStatus || item.type !== 'MCP Server') return null;
    
    switch (healthStatus.status) {
      case 'online':
        return <CheckCircle size={12} className="text-green-500" />;
      case 'offline':
        return <WifiOff size={12} className="text-red-500" />;
      case 'error':
        return <AlertTriangle size={12} className="text-yellow-500" />;
      case 'timeout':
        return <AlertTriangle size={12} className="text-orange-500" />;
      case 'checking':
        return <Loader2 size={12} className="text-blue-500 animate-spin" />;
      default:
        return <Wifi size={12} className="text-gray-400" />;
    }
  };

  const getHealthTooltip = () => {
    if (!healthStatus || item.type !== 'MCP Server') return '';
    
    const parts = [
      `Status: ${healthStatus.status}`,
      healthStatus.responseTime ? `Response: ${healthStatus.responseTime}ms` : '',
      healthStatus.message ? `Message: ${healthStatus.message}` : '',
      healthStatus.lastChecked ? `Last checked: ${healthStatus.lastChecked.toLocaleTimeString()}` : ''
    ].filter(Boolean);
    
    return parts.join('\n');
  };
  
  if (!canToggle) {
    return (
      <div className="flex items-center gap-2">
        <div className={`size-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {item.status}
        </Badge>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
          <div className="flex items-center gap-2" title={getHealthTooltip()}>
            <div className={`size-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            {getHealthIcon()}
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              {item.status}
            </Badge>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onToggle(item.id, true)}>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-500" />
            <Badge variant="outline" className="text-green-600">Active</Badge>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggle(item.id, false)}>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-gray-400" />
            <Badge variant="outline" className="text-gray-600">Inactive</Badge>
          </div>
        </DropdownMenuItem>
        {item.serverId && onTestConnection && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => item.serverId && onTestConnection(item.serverId)}>
              <div className="flex items-center gap-2">
                <Wifi size={12} />
                Test Connection
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function McpServerSettings({
  servers = [],
  onServersChange,
  className,
}: McpServerSettingsProps) {
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [loading, setLoading] = useState(false);
  const [unifiedData, setUnifiedData] = useState<UnifiedTableData[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [serverHealthStatus, setServerHealthStatus] = useState<Record<string, ServerHealthStatus>>({});

  // Function to fetch tools from a server
  const fetchServerTools = useCallback(async (serverId: string) => {
    try {
      const response = await fetch(`/api/mcp-servers/${serverId}/tools`);
      if (response.ok) {
        const data = await response.json();
        setServerHealthStatus(prev => ({
          ...prev,
          [serverId]: {
            ...prev[serverId],
            tools: data.tools || []
          }
        }));
        return data.tools || [];
      }
    } catch (error) {
      console.error('Failed to fetch tools:', error);
    }
    return [];
  }, []);

  // Function to test server connectivity
  const testServerConnection = useCallback(async (serverId: string) => {
    setServerHealthStatus(prev => ({
      ...prev,
      [serverId]: { status: 'checking' }
    }));

    try {
      const response = await fetch(`/api/mcp-servers/${serverId}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        const healthData = await response.json();
        setServerHealthStatus(prev => ({
          ...prev,
          [serverId]: {
            ...healthData,
            lastChecked: new Date()
          }
        }));
        
        // If server is online and active, fetch tools
        const server = servers.find(s => s.id === serverId);
        if (healthData.status === 'online' && server?.isActive) {
          await fetchServerTools(serverId);
        }
      } else {
        setServerHealthStatus(prev => ({
          ...prev,
          [serverId]: {
            status: 'error',
            message: 'Failed to test connection',
            lastChecked: new Date()
          }
        }));
      }
    } catch (error) {
      setServerHealthStatus(prev => ({
        ...prev,
        [serverId]: {
          status: 'offline',
          message: 'Connection failed',
          lastChecked: new Date()
        }
      }));
    }
  }, [servers, fetchServerTools]);

  // Handler for toggling server status
  const handleStatusToggle = useCallback(async (id: number, newStatus: boolean) => {
    const item = unifiedData.find(item => item.id === id);
    if (!item || item.type !== 'MCP Server') return;

    // Find the actual server
    const server = servers.find(s => s.name === item.header);
    if (!server) return;

    // Optimistic update - update the unified data immediately
    const optimisticUnifiedData = unifiedData.map((dataItem) =>
      dataItem.id === id ? { ...dataItem, status: newStatus ? 'Active' : 'Inactive' } : dataItem,
    );
    setUnifiedData(optimisticUnifiedData);

    // Also update the servers prop for consistency
    const optimisticUpdatedServers = servers.map((s) =>
      s.id === server.id ? { ...s, isActive: newStatus } : s,
    );
    onServersChange?.(optimisticUpdatedServers);

    // Make the API call in the background
    try {
      const response = await fetch(`/api/mcp-servers/${server.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...server,
          isActive: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update server');
      }

      toast.success(`Server ${newStatus ? 'activated' : 'deactivated'}`);
      
      // If activating, test connection and fetch tools
      if (newStatus) {
        await testServerConnection(server.id);
      }
    } catch (error) {
      console.error('Error updating server:', error);
      
      // Revert both the unified data and servers on error
      const revertedUnifiedData = unifiedData.map((dataItem) =>
        dataItem.id === id ? { ...dataItem, status: !newStatus ? 'Active' : 'Inactive' } : dataItem,
      );
      setUnifiedData(revertedUnifiedData);
      
      const revertedServers = servers.map((s) =>
        s.id === server.id ? { ...s, isActive: !newStatus } : s,
      );
      onServersChange?.(revertedServers);
      
      toast.error('Failed to update server status - reverted change');
    }
  }, [unifiedData, servers, onServersChange, testServerConnection]);

  const form = useForm<McpServerForm>({
    defaultValues: {
      name: '',
      url: '',
      apiKey: '',
      description: '',
      isActive: true,
    },
  });

  // Fetch and combine servers, tools, and integrated tools into unified data
  useEffect(() => {
    const fetchUnifiedData = async () => {
      const activeServers = servers.filter((server) => server.isActive);

      try {
        const allData: UnifiedTableData[] = [];
        let counter = 1;

        // Collect all MCP tool names first to avoid duplicates
        const mcpToolNames = new Set<string>();
        
        // Add MCP servers with their tools information
        for (const server of servers) {
          let toolsInfo = 'No tools available';
          let toolCount = 0;
          let serverStatus = server.isActive ? 'Active' : 'Inactive';
          
          // If server is active, try to fetch tools
          if (server.isActive) {
            try {
              const response = await fetch(
                `/api/mcp-servers/${server.id}/tools`,
              );
              if (response.ok) {
                const data = await response.json();
                
                if (data.tools && Array.isArray(data.tools) && data.tools.length > 0) {
                  toolCount = data.tools.length;
                  const toolNames = data.tools.map((tool: any) => tool.name).slice(0, 3);
                  toolsInfo = toolNames.join(', ');
                  if (data.tools.length > 3) {
                    toolsInfo += ` and ${data.tools.length - 3} more`;
                  }
                  
                  // Track tool names for deduplication
                  data.tools.forEach((tool: any) => {
                    mcpToolNames.add(tool.name.toLowerCase());
                  });
                } else if (data.status !== 'success') {
                  toolsInfo = data.message || 'Failed to fetch tools';
                  serverStatus = 'Error';
                }
              } else {
                toolsInfo = `HTTP ${response.status} - Failed to fetch tools`;
                serverStatus = 'Error';
              }
            } catch (error) {
              console.error(
                `Failed to fetch tools for server ${server.name}:`,
                error,
              );
              toolsInfo = 'Connection failed';
              serverStatus = 'Error';
            }
          }
          
          allData.push({
            id: counter++,
            header: server.name,
            type: 'MCP Server',
            status: serverStatus,
            target: server.url,
            limit: toolCount.toString(),
            reviewer: server.description ? `${server.description} • Tools: ${toolsInfo}` : `Tools: ${toolsInfo}`,
            serverId: server.id,
            healthStatus: serverHealthStatus[server.id] ? {
              status: serverHealthStatus[server.id].status,
              responseTime: serverHealthStatus[server.id].responseTime,
              statusCode: serverHealthStatus[server.id].statusCode,
              message: serverHealthStatus[server.id].message,
              lastChecked: serverHealthStatus[server.id].lastChecked,
            } : undefined,
          });
        }

        // Add integrated tools, but skip if MCP server provides same tool
        const integratedTools = [
          {
            name: 'Weather',
            description: 'Get current weather information',
            parameters: 1,
          },
          {
            name: 'Charts',
            description: 'Create data visualizations',
            parameters: 2,
          },
          {
            name: 'Documents',
            description: 'Create and edit documents',
            parameters: 2,
          },
          {
            name: 'Update Document',
            description: 'Update existing documents',
            parameters: 2,
          },
          {
            name: 'Suggestions',
            description: 'Get content suggestions',
            parameters: 1,
          },
        ];

        integratedTools.forEach((tool) => {
          // Only add integrated tool if no MCP server provides it
          if (!mcpToolNames.has(tool.name.toLowerCase())) {
            allData.push({
              id: counter++,
              header: tool.name,
              type: 'Integrated Tool',
              status: 'Active',
              target: 'Built-in',
              limit: tool.parameters,
              reviewer: tool.description,
            });
          }
        });

        setUnifiedData(allData);
      } catch (error) {
        console.error('Error fetching unified data:', error);
      }
    };

    fetchUnifiedData();
  }, [servers, serverHealthStatus]);

  // Auto-check health for active servers on mount and when servers change
  useEffect(() => {
    const activeServers = servers.filter(server => server.isActive);
    
    // Check health for active servers that haven't been checked recently
    activeServers.forEach(server => {
      const lastCheck = serverHealthStatus[server.id]?.lastChecked;
      const shouldCheck = !lastCheck || (Date.now() - lastCheck.getTime()) > 30000; // Check every 30 seconds
      
      if (shouldCheck) {
        testServerConnection(server.id);
      }
    });
  }, [servers, testServerConnection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Define custom columns for the DataTable
  const columns: ColumnDef<UnifiedTableData>[] = useMemo(() => [
    {
      accessorKey: 'header',
      header: 'Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.header}</div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusCell
          item={row.original}
          onToggle={handleStatusToggle}
          onTestConnection={testServerConnection}
        />
      ),
    },
    {
      accessorKey: 'target',
      header: 'URL/Source',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-48 truncate">
          {row.original.target}
        </div>
      ),
    },
    {
      accessorKey: 'limit',
      header: 'Tools',
      cell: ({ row }) => (
        <div className="text-sm font-medium">
          {row.original.type === 'MCP Server' ? `${row.original.limit} tools` : row.original.limit}
        </div>
      ),
    },
    {
      accessorKey: 'reviewer',
      header: 'Description & Available Tools',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-96 truncate">
          {row.original.reviewer}
        </div>
      ),
    },
  ], [handleStatusToggle, testServerConnection]);

  const handleEditServer = (server: McpServer) => {
    setEditingServer(server);
    setShowDialog(true);
    form.reset({
      name: server.name,
      url: server.url,
      apiKey: server.apiKey || '',
      description: server.description || '',
      isActive: server.isActive,
    });
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this MCP server?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/mcp-servers/${serverId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete server');
      }

      const updatedServers = servers.filter((s) => s.id !== serverId);
      onServersChange?.(updatedServers);
      toast.success('MCP server deleted successfully');
    } catch (error) {
      console.error('Error deleting server:', error);
      toast.error('Failed to delete MCP server');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: McpServerForm) => {
    // Basic validation
    if (!data.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!data.url.trim()) {
      toast.error('URL is required');
      return;
    }
    try {
      new URL(data.url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setLoading(true);
    try {
      const url = editingServer
        ? `/api/mcp-servers/${editingServer.id}`
        : '/api/mcp-servers';

      const method = editingServer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save server');
      }

      const savedServer = await response.json();

      if (editingServer) {
        const updatedServers = servers.map((s) =>
          s.id === editingServer.id ? savedServer : s,
        );
        onServersChange?.(updatedServers);
        toast.success('MCP server updated successfully');
      } else {
        onServersChange?.([...servers, savedServer]);
        toast.success('MCP server created successfully');
      }

      form.reset();
      setEditingServer(null);
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving server:', error);
      toast.error('Failed to save MCP server');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setEditingServer(null);
    setShowDialog(false);
  };

  const handleAddServerClick = () => {
    setShowDialog(true);
    setEditingServer(null);
    form.reset();
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden ${className}`}>
      <div className="p-6 border-b">
        <h1 className="text-2xl font-semibold">MCP Server Settings</h1>
        <p className="text-muted-foreground">
          Manage your Model Context Protocol (MCP) servers. These servers
          provide additional tools and capabilities for your AI assistant.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Unified Table for Servers and Tools */}
        {unifiedData.length > 0 ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Servers and Tools</h3>
              <p className="text-sm text-muted-foreground">
                All MCP servers, integrated tools, and MCP server tools available to the AI assistant
              </p>
            </div>
            <div className="-mx-6">
              <DataTable 
                key={`datatable-${servers.length}-${servers.map(s => `${s.id}-${s.isActive}`).join('-')}`}
                data={unifiedData as any[]} 
                columns={columns}
                addButtonText="Add MCP Server"
                onAddClick={handleAddServerClick}
              />
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <div className="text-muted-foreground mb-4">
                <CodeIcon size={48} />
              </div>
              <h3 className="text-lg font-semibold">No Servers or Tools</h3>
              <p className="text-muted-foreground text-center mt-2">
                Add an MCP server to get started with additional tools beyond the built-in integrated tools
              </p>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Server Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-screen-toast-mobile">
            <DialogHeader>
              <DialogTitle>
                {editingServer ? 'Edit MCP Server' : 'Add New MCP Server'}
              </DialogTitle>
              <DialogDescription>
                {editingServer
                  ? `Editing server: ${editingServer.name}`
                  : 'Configure a new MCP server to extend your AI assistant capabilities'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My MCP Server" {...field} />
                        </FormControl>
                        <FormDescription>
                          A friendly name for your MCP server
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="http://localhost:8000/sse/"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The URL endpoint for your MCP server
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter API key if required"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        API key for authentication, if required by your
                        server
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this MCP server provides..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional description of the server&apos;s
                        capabilities
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable this MCP server for use in conversations
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? 'Saving...'
                      : editingServer
                        ? 'Update Server'
                        : 'Add Server'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
