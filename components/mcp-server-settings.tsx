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
import { ServerIcon, TrashIcon, EditIcon, CodeIcon } from './icons';
import { Badge } from '@/components/ui/badge';
import type { McpServer } from '@/lib/db/schema';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

// Define schema for the DataTable
const serverTableSchema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.union([z.string(), z.number()]),
  reviewer: z.string(),
});

// Define schema for the tools table
const toolsTableSchema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.union([z.string(), z.number()]),
  reviewer: z.string(),
});

type ToolsTableData = z.infer<typeof toolsTableSchema>;

export function McpServerSettings({
  servers = [],
  onServersChange,
  className,
}: McpServerSettingsProps) {
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('servers');
  const [serverTools, setServerTools] = useState<ToolsTableData[]>([]);

  const form = useForm<McpServerForm>({
    defaultValues: {
      name: '',
      url: '',
      apiKey: '',
      description: '',
      isActive: true,
    },
  });

  // Convert servers to DataTable format
  const serverTableData = servers.map((server, index) => ({
    id: index + 1,
    header: server.name,
    type: 'MCP Server',
    status: server.isActive ? 'Active' : 'Inactive',
    target: server.url,
    limit: server.apiKey ? '••••••' : 'None',
    reviewer: server.description || 'No description',
  }));

  // Fetch tools for active servers
  useEffect(() => {
    const fetchTools = async () => {
      if (activeTab === 'tools' && servers.length > 0) {
        const activeServers = servers.filter((server) => server.isActive);

        try {
          const toolsData: ToolsTableData[] = [];
          let counter = 1;

          for (const server of activeServers) {
            try {
              const response = await fetch(
                `/api/mcp-servers/${server.id}/tools`,
              );
              if (response.ok) {
                const data = await response.json();
                if (data.tools && Array.isArray(data.tools)) {
                  data.tools.forEach((tool: any) => {
                    toolsData.push({
                      id: counter++,
                      header: tool.name,
                      type: 'Tool',
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

          setServerTools(toolsData);
        } catch (error) {
          console.error('Error fetching tools:', error);
        }
      }
    };

    fetchTools();
  }, [activeTab, servers]);

  const handleEditServer = (server: McpServer) => {
    setEditingServer(server);
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

      <div className="flex-1 overflow-auto p-6">
        <Tabs
          defaultValue="servers"
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="servers">Servers</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="servers" className="space-y-6">
            {/* Servers Table View */}
            {servers.length > 0 && (
              <div className="space-y-4">
                <DataTable data={serverTableData as any[]} />
              </div>
            )}

            {/* Existing Servers List - Traditional View */}
            {servers.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Your MCP Servers</h3>
                <div className="grid gap-4">
                  {servers.map((server) => (
                    <Card key={server.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{server.name}</h4>
                            <Badge
                              variant={
                                server.isActive ? 'default' : 'secondary'
                              }
                            >
                              {server.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {server.url}
                          </p>
                          {server.description && (
                            <p className="text-sm text-muted-foreground">
                              {server.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditServer(server)}
                            disabled={loading}
                          >
                            <EditIcon size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteServer(server.id)}
                            disabled={loading}
                            className="text-destructive hover:text-destructive"
                          >
                            <TrashIcon size={16} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Add/Edit Server Form */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingServer ? 'Edit MCP Server' : 'Add New MCP Server'}
                </CardTitle>
                <CardDescription>
                  {editingServer
                    ? `Editing server: ${editingServer.name}`
                    : 'Configure a new MCP server to extend your AI assistant capabilities'}
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                      {editingServer && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      )}
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            {/* Tools Table */}
            {serverTools.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Available MCP Tools</h3>
                <DataTable data={serverTools as any[]} />
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <div className="text-muted-foreground mb-4">
                    <CodeIcon size={48} />
                  </div>
                  <h3 className="text-lg font-semibold">No Tools Available</h3>
                  <p className="text-muted-foreground text-center mt-2">
                    {servers.length === 0
                      ? 'Add an MCP server to discover available tools'
                      : 'No tools found from your active MCP servers'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
