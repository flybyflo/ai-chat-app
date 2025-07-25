'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { ServerIcon, TrashIcon, EditIcon } from './icons';
import { Badge } from '@/components/ui/badge';
import type { McpServer } from '@/lib/db/schema';
import { toast } from 'sonner';

const mcpServerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  url: z.string().url('Must be a valid URL'),
  apiKey: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type McpServerForm = z.infer<typeof mcpServerSchema>;

interface McpServerDialogProps {
  trigger?: React.ReactNode;
  servers?: McpServer[];
  onServersChange?: (servers: McpServer[]) => void;
}

export function McpServerDialog({ 
  trigger, 
  servers = [], 
  onServersChange 
}: McpServerDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<McpServerForm>({
    defaultValues: {
      name: '',
      url: '',
      apiKey: '',
      description: '',
      isActive: true,
    },
  });

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

      const updatedServers = servers.filter(s => s.id !== serverId);
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
        const updatedServers = servers.map(s => 
          s.id === editingServer.id ? savedServer : s
        );
        onServersChange?.(updatedServers);
        toast.success('MCP server updated successfully');
      } else {
        onServersChange?.([...servers, savedServer]);
        toast.success('MCP server created successfully');
      }

      form.reset();
      setEditingServer(null);
      setOpen(false);
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
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ServerIcon size={16} />
            MCP Servers
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>MCP Server Management</DialogTitle>
          <DialogDescription>
            Manage your Model Context Protocol (MCP) servers. These servers provide additional tools and capabilities for your AI assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Servers List */}
          {servers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your MCP Servers</h3>
              <div className="grid gap-4">
                {servers.map((server) => (
                  <div
                    key={server.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{server.name}</h4>
                        <Badge variant={server.isActive ? 'default' : 'secondary'}>
                          {server.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{server.url}</p>
                      {server.description && (
                        <p className="text-sm text-muted-foreground">{server.description}</p>
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add/Edit Server Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {editingServer ? 'Edit MCP Server' : 'Add New MCP Server'}
            </h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <Input placeholder="http://localhost:8000/sse/" {...field} />
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
                        <Input type="password" placeholder="Enter API key if required" {...field} />
                      </FormControl>
                      <FormDescription>
                        API key for authentication, if required by your server
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
                        Optional description of the server&apos;s capabilities
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

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : editingServer ? 'Update Server' : 'Add Server'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}