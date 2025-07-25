'use client';

import { useState, useEffect } from 'react';
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
});

type UnifiedTableData = z.infer<typeof unifiedTableSchema>;

// Status component with dropdown
function StatusCell({ 
  item, 
  onToggle 
}: { 
  item: UnifiedTableData; 
  onToggle: (id: number, newStatus: boolean) => void;
}) {
  const isActive = item.status === 'Active';
  const canToggle = item.type === 'MCP Server'; // Only servers can be toggled
  
  if (!canToggle) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
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
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              {item.status}
            </Badge>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onToggle(item.id, true)}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <Badge variant="outline" className="text-green-600">Active</Badge>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggle(item.id, false)}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <Badge variant="outline" className="text-gray-600">Inactive</Badge>
          </div>
        </DropdownMenuItem>
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

  // Handler for toggling server status
  const handleStatusToggle = async (id: number, newStatus: boolean) => {
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
  };

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

        // Add MCP servers first
        servers.forEach((server) => {
          allData.push({
            id: counter++,
            header: server.name,
            type: 'MCP Server',
            status: server.isActive ? 'Active' : 'Inactive',
            target: server.url,
            limit: server.apiKey ? '••••••' : 'None',
            reviewer: server.description || 'No description',
          });
        });

        // Add integrated tools
        const integratedTools = [
          {
            name: 'Weather',
            description: 'Get current weather information',
            parameters: 1, // location parameter
          },
          {
            name: 'Charts',
            description: 'Create data visualizations',
            parameters: 2, // data and type parameters
          },
          {
            name: 'Documents',
            description: 'Create and edit documents',
            parameters: 2, // title and content parameters
          },
          {
            name: 'Update Document',
            description: 'Update existing documents',
            parameters: 2, // id and content parameters
          },
          {
            name: 'Suggestions',
            description: 'Get content suggestions',
            parameters: 1, // context parameter
          },
        ];

        integratedTools.forEach((tool) => {
          allData.push({
            id: counter++,
            header: tool.name,
            type: 'Integrated Tool',
            status: 'Active',
            target: 'Built-in',
            limit: tool.parameters,
            reviewer: tool.description,
          });
        });

        // Add MCP server tools
        for (const server of activeServers) {
          try {
            const response = await fetch(
              `/api/mcp-servers/${server.id}/tools`,
            );
            if (response.ok) {
              const data = await response.json();
              if (data.tools && Array.isArray(data.tools)) {
                data.tools.forEach((tool: any) => {
                  allData.push({
                    id: counter++,
                    header: tool.name,
                    type: 'MCP Tool',
                    status: 'Available',
                    target: server.name,
                    limit: tool.parameters
                      ? Object.keys(tool.parameters).length
                      : '0',
                    reviewer: tool.description || 'No description',
                  });
                });
              }
            }
          } catch (error) {
            console.error(
              `Failed to fetch tools for server ${server.name}:`,
              error,
            );
          }
        }

        setUnifiedData(allData);
      } catch (error) {
        console.error('Error fetching unified data:', error);
      }
    };

    fetchUnifiedData();
  }, [servers]);

  // Define custom columns for the DataTable
  const columns: ColumnDef<UnifiedTableData>[] = [
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
        />
      ),
    },
    {
      accessorKey: 'target',
      header: 'Target/Source',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-48 truncate">
          {row.original.target}
        </div>
      ),
    },
    {
      accessorKey: 'reviewer',
      header: 'Description',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-64 truncate">
          {row.original.reviewer}
        </div>
      ),
    },
  ];

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
      <div className="px-6 py-6 border-b">
        <h1 className="text-2xl font-semibold">MCP Server Settings</h1>
        <p className="text-muted-foreground">
          Manage your Model Context Protocol (MCP) servers. These servers
          provide additional tools and capabilities for your AI assistant.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
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
          <DialogContent className="sm:max-w-[600px]">
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
