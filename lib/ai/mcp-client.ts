import { experimental_createMCPClient as createMCPClient } from 'ai';

// MCP Server configuration type
export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey?: string | null;
  isActive: boolean;
}

// MCP Client cache per server
const mcpClients = new Map<string, any>();
const toolsCaches = new Map<string, any>();
const lastDiscoveryTimes = new Map<string, number>();
const CACHE_DURATION = 30000; // 30 seconds cache

// Extract server name from MCP server URL
export function getMCPServerName(serverUrl?: string): string {
  // Fallback to environment variable if no serverUrl provided (for backward compatibility)
  const mcpServerUrl = serverUrl || process.env.MCP_SERVER_URL;
  if (!mcpServerUrl) {
    return 'unknown';
  }

  try {
    const url = new URL(mcpServerUrl);
    const hostname = url.hostname;
    
    // If it's localhost or 127.0.0.1, try to extract from port or path
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const port = url.port;
      if (port) {
        return `local-${port}`;
      }
      return 'local';
    }
    
    // For other hostnames, use the hostname
    return hostname.replace(/\./g, '-');
  } catch (error) {
    console.warn('Failed to parse MCP server URL:', error);
    return 'unknown';
  }
}

export async function getMCPClient(serverConfig?: MCPServerConfig) {
  // For backward compatibility, fall back to environment variables if no server config provided
  let config = serverConfig;
  if (!config) {
    const mcpServerUrl = process.env.MCP_SERVER_URL;
    if (!mcpServerUrl) {
      console.log('No MCP server configuration provided, skipping MCP client initialization');
      return null;
    }
    
    config = {
      id: 'env-server',
      name: 'Environment Server',
      url: mcpServerUrl,
      apiKey: process.env.MCP_API_KEY,
      isActive: true,
    };
  }

  // Return cached client if available
  const cachedClient = mcpClients.get(config.id);
  if (cachedClient) {
    return cachedClient;
  }

  if (!config.isActive) {
    console.log(`MCP server ${config.name} is inactive, skipping initialization`);
    return null;
  }

  try {
    console.log('🔌 Initializing MCP client with SSE transport:', config.url);
    
    const client = await createMCPClient({
      transport: {
        type: 'sse',
        url: config.url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...(config.apiKey && { 
            Authorization: `Bearer ${config.apiKey}` 
          }),
        },
      },
    });

    // Cache the client
    mcpClients.set(config.id, client);
    console.log(`✅ MCP client initialized successfully for ${config.name}`);
    return client;
  } catch (error) {
    console.error(`❌ Failed to initialize MCP client for ${config.name}:`, error);
    return null;
  }
}

// Get detailed information about available MCP tools from multiple servers
export async function getMCPToolsInfo(serverConfigs?: MCPServerConfig[]) {
  const tools = await getMCPTools(serverConfigs);
  
  if (!tools || typeof tools !== 'object') {
    return null;
  }

  const toolsInfo = Object.entries(tools).map(([name, tool]: [string, any]) => ({
    name,
    description: tool.description || 'No description available',
    parameters: tool.parameters || null,
    // Additional metadata if available
    ...(tool.inputSchema && { inputSchema: tool.inputSchema }),
  }));

  return {
    count: toolsInfo.length,
    tools: toolsInfo,
  };
}

// Auto-discover MCP tools with caching from multiple servers
export async function getMCPTools(serverConfigs?: MCPServerConfig[]) {
  const now = Date.now();
  
  // If no server configs provided, fall back to single server mode for backward compatibility
  if (!serverConfigs || serverConfigs.length === 0) {
    const cacheKey = 'env-server';
    const cachedTools = toolsCaches.get(cacheKey);
    const lastDiscovery = lastDiscoveryTimes.get(cacheKey) || 0;
    
    // Return cached tools if they're still fresh
    if (cachedTools && (now - lastDiscovery) < CACHE_DURATION) {
      console.log('📋 Using cached MCP tools');
      return cachedTools;
    }

    const client = await getMCPClient();
    
    if (!client) {
      console.log('🚫 No MCP client available');
      return {};
    }

    try {
      console.log('🔍 Discovering MCP tools...');
      
      // Use AI SDK's automatic tool discovery
      const tools = await client.tools();
      
      if (tools && typeof tools === 'object') {
        const toolNames = Object.keys(tools);
        console.log(`🛠️  Discovered ${toolNames.length} MCP tools:`, toolNames);
        
        // Cache the tools
        toolsCaches.set(cacheKey, tools);
        lastDiscoveryTimes.set(cacheKey, now);
        
        return tools;
      } else {
        console.log('⚠️  No tools discovered from MCP server');
        return {};
      }
    } catch (error) {
      console.error('❌ Failed to discover MCP tools:', error);
      return {};
    }
  }

  // Multi-server mode: collect tools from all active servers
  const allTools: Record<string, any> = {};
  
  for (const serverConfig of serverConfigs) {
    if (!serverConfig.isActive) continue;
    
    const cacheKey = serverConfig.id;
    const cachedTools = toolsCaches.get(cacheKey);
    const lastDiscovery = lastDiscoveryTimes.get(cacheKey) || 0;
    
    // Use cached tools if fresh
    if (cachedTools && (now - lastDiscovery) < CACHE_DURATION) {
      console.log(`📋 Using cached MCP tools for ${serverConfig.name}`);
      Object.assign(allTools, cachedTools);
      continue;
    }

    const client = await getMCPClient(serverConfig);
    
    if (!client) {
      console.log(`🚫 No MCP client available for ${serverConfig.name}`);
      continue;
    }

    try {
      console.log(`🔍 Discovering MCP tools from ${serverConfig.name}...`);
      
      const tools = await client.tools();
      
      if (tools && typeof tools === 'object') {
        const toolNames = Object.keys(tools);
        console.log(`🛠️  Discovered ${toolNames.length} MCP tools from ${serverConfig.name}:`, toolNames);
        
        // Namespace tools with server name to avoid conflicts
        const namespacedTools: Record<string, any> = {};
        for (const [name, tool] of Object.entries(tools)) {
          const namespacedName = `mcp__${serverConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}__${name}`;
          namespacedTools[namespacedName] = {
            ...tool,
            _mcpServer: serverConfig.name,
            _mcpServerId: serverConfig.id,
          };
        }
        
        // Cache the tools for this server
        toolsCaches.set(cacheKey, namespacedTools);
        lastDiscoveryTimes.set(cacheKey, now);
        
        Object.assign(allTools, namespacedTools);
      } else {
        console.log(`⚠️  No tools discovered from ${serverConfig.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to discover MCP tools from ${serverConfig.name}:`, error);
    }
  }
  
  return allTools;
}

// Get MCP tools with explicit schemas (for advanced use cases)
export async function getMCPToolsWithSchemas(customSchemas: Record<string, any> = {}, serverConfigs?: MCPServerConfig[]) {
  // For backward compatibility, use single server mode if no configs provided
  if (!serverConfigs || serverConfigs.length === 0) {
    const client = await getMCPClient();
    
    if (!client) {
      return {};
    }

    try {
      console.log('🔍 Getting MCP tools with custom schemas...');
      
      const tools = await client.tools({
        schemas: customSchemas,
      });
      
      if (tools && typeof tools === 'object') {
        const toolNames = Object.keys(tools);
        console.log(`🛠️  Retrieved ${toolNames.length} MCP tools with schemas:`, toolNames);
        return tools;
      }
      
      return {};
    } catch (error) {
      console.error('❌ Failed to get MCP tools with schemas:', error);
      return {};
    }
  }

  // Multi-server mode
  const allTools: Record<string, any> = {};
  
  for (const serverConfig of serverConfigs) {
    if (!serverConfig.isActive) continue;
    
    const client = await getMCPClient(serverConfig);
    
    if (!client) {
      console.log(`🚫 No MCP client available for ${serverConfig.name}`);
      continue;
    }

    try {
      console.log(`🔍 Getting MCP tools with custom schemas from ${serverConfig.name}...`);
      
      const tools = await client.tools({
        schemas: customSchemas,
      });
      
      if (tools && typeof tools === 'object') {
        const toolNames = Object.keys(tools);
        console.log(`🛠️  Retrieved ${toolNames.length} MCP tools with schemas from ${serverConfig.name}:`, toolNames);
        
        // Namespace tools with server name
        for (const [name, tool] of Object.entries(tools)) {
          const namespacedName = `mcp__${serverConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}__${name}`;
          allTools[namespacedName] = {
            ...tool,
            _mcpServer: serverConfig.name,
            _mcpServerId: serverConfig.id,
          };
        }
      }
    } catch (error) {
      console.error(`❌ Failed to get MCP tools with schemas from ${serverConfig.name}:`, error);
    }
  }
  
  return allTools;
}

// Clear tools cache (useful for development)
export function clearMCPToolsCache(serverId?: string) {
  if (serverId) {
    console.log(`🗑️  Clearing MCP tools cache for server ${serverId}`);
    toolsCaches.delete(serverId);
    lastDiscoveryTimes.delete(serverId);
  } else {
    console.log('🗑️  Clearing all MCP tools caches');
    toolsCaches.clear();
    lastDiscoveryTimes.clear();
  }
}

// Close specific MCP client
export async function closeMCPClient(serverId?: string) {
  if (serverId) {
    const client = mcpClients.get(serverId);
    if (client) {
      try {
        await client.close();
        mcpClients.delete(serverId);
        clearMCPToolsCache(serverId);
      } catch (error) {
        console.error(`Failed to close MCP client for server ${serverId}:`, error);
      }
    }
  } else {
    // Close all clients
    for (const [id, client] of mcpClients.entries()) {
      try {
        await client.close();
      } catch (error) {
        console.error(`Failed to close MCP client for server ${id}:`, error);
      }
    }
    mcpClients.clear();
    clearMCPToolsCache();
  }
}

// Cleanup function for graceful shutdown
process.on('SIGTERM', closeMCPClient);
process.on('SIGINT', closeMCPClient);