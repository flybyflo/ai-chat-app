import { auth } from '@/app/(auth)/auth';
import { mcpServer } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { type NextRequest, NextResponse } from 'next/server';

// Database setup
const postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl) {
  throw new Error('POSTGRES_URL environment variable is required');
}
const client = postgres(postgresUrl);
const db = drizzle(client);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    
    // Get the server from database
    const [server] = await db
      .select()
      .from(mcpServer)
      .where(
        and(
          eq(mcpServer.id, resolvedParams.id),
          eq(mcpServer.userId, session.user.id)
        )
      );

    if (!server) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
      );
    }

    // Fetch available tools from the MCP server
    const result = await fetchServerTools(server.url, server.apiKey);
    
    return NextResponse.json({ 
      tools: result.tools, 
      serverName: server.name,
      status: result.status,
      message: result.message
    });
  } catch (error) {
    console.error('Error fetching MCP server tools:', error);
    return NextResponse.json(
      { 
        tools: [], 
        serverName: server.name,
        status: 'error',
        message: 'Failed to fetch tools from MCP server'
      },
      { status: 200 } // Return 200 with error info instead of 500
    );
  }
}

async function fetchServerTools(url: string, apiKey?: string | null) {
  try {
    // Import the AI SDK MCP client
    const { experimental_createMCPClient } = await import('ai');
    
    // Create MCP client with SSE transport
    const client = await experimental_createMCPClient({
      transport: {
        type: 'sse',
        url: url, // Use the provided URL directly
      },
    });

    try {
      // Fetch tools using the MCP client
      const toolSet = await client.tools();
      
      // Log the actual structure for debugging
      console.log('MCP toolSet structure:', JSON.stringify(toolSet, null, 2));
      console.log('MCP toolSet keys:', Object.keys(toolSet));
      
      // The toolSet is an object where keys are tool names and values are tool definitions
      // AI SDK format: { toolName: { description, parameters, execute } }
      const tools = Object.entries(toolSet).map(([toolName, toolDefinition]: [string, any]) => {
        console.log(`Processing tool: ${toolName}`, JSON.stringify(toolDefinition, null, 2));
        
        return {
          name: toolName,
          description: toolDefinition.description || 'No description available',
          parameters: toolDefinition.parameters || {},
        };
      });

      // Close the client
      await client.close();

      return {
        tools,
        status: 'success',
        message: `Found ${tools.length} tools via MCP`
      };
    } catch (clientError) {
      // Make sure to close the client even on error
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing MCP client:', closeError);
      }
      throw clientError;
    }
  } catch (error: any) {
    console.error('Error fetching MCP tools:', error);
    
    let status = 'error';
    let message = 'Failed to fetch tools via MCP';
    
    if (error.name === 'AbortError') {
      status = 'timeout';
      message = 'MCP connection timed out';
    } else if (error.code === 'ECONNREFUSED') {
      status = 'offline';
      message = 'MCP server is not reachable (connection refused)';
    } else if (error.code === 'ENOTFOUND') {
      status = 'offline';
      message = 'MCP server hostname not found';
    } else if (error.message?.includes('404')) {
      status = 'error';
      message = 'MCP endpoint not found - check server URL';
    }
    
    return {
      tools: [],
      status,
      message
    };
  }
}