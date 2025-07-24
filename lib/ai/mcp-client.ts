import { experimental_createMCPClient as createMCPClient } from 'ai';

// MCP Client configuration
let mcpClient: any = null;
let toolsCache: any = null;
let lastDiscoveryTime = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

// Extract server name from MCP server URL
export function getMCPServerName(): string {
  const mcpServerUrl = process.env.MCP_SERVER_URL;
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

export async function getMCPClient() {
  if (mcpClient) {
    return mcpClient;
  }

  const mcpServerUrl = process.env.MCP_SERVER_URL;
  if (!mcpServerUrl) {
    console.log('No MCP_SERVER_URL configured, skipping MCP client initialization');
    return null;
  }

  try {
    console.log('🔌 Initializing MCP client with SSE transport:', mcpServerUrl);
    
    mcpClient = await createMCPClient({
      transport: {
        type: 'sse',
        url: mcpServerUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...(process.env.MCP_API_KEY && { 
            Authorization: `Bearer ${process.env.MCP_API_KEY}` 
          }),
        },
      },
    });

    console.log('✅ MCP client initialized successfully');
    return mcpClient;
  } catch (error) {
    console.error('❌ Failed to initialize MCP client:', error);
    return null;
  }
}

// Get detailed information about available MCP tools
export async function getMCPToolsInfo() {
  const tools = await getMCPTools();
  
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

// Auto-discover MCP tools with caching
export async function getMCPTools() {
  const now = Date.now();
  
  // Return cached tools if they're still fresh
  if (toolsCache && (now - lastDiscoveryTime) < CACHE_DURATION) {
    console.log('📋 Using cached MCP tools');
    return toolsCache;
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
      toolsCache = tools;
      lastDiscoveryTime = now;
      
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

// Get MCP tools with explicit schemas (for advanced use cases)
export async function getMCPToolsWithSchemas(customSchemas: Record<string, any> = {}) {
  const client = await getMCPClient();
  
  if (!client) {
    return {};
  }

  try {
    console.log('🔍 Getting MCP tools with custom schemas...');
    
    // Use explicit schema definitions if provided
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

// Clear tools cache (useful for development)
export function clearMCPToolsCache() {
  console.log('🗑️  Clearing MCP tools cache');
  toolsCache = null;
  lastDiscoveryTime = 0;
}

export async function closeMCPClient() {
  if (mcpClient) {
    try {
      await mcpClient.close();
      mcpClient = null;
    } catch (error) {
      console.error('Failed to close MCP client:', error);
    }
  }
}

// Cleanup function for graceful shutdown
process.on('SIGTERM', closeMCPClient);
process.on('SIGINT', closeMCPClient);