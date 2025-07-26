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

export async function POST(
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

    // Test server connectivity
    const testResult = await testServerConnectivity(server.url, server.apiKey);
    
    return NextResponse.json(testResult);
  } catch (error) {
    console.error('Error testing MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to test MCP server connectivity' },
      { status: 500 }
    );
  }
}

async function testServerConnectivity(url: string, apiKey?: string | null) {
  const startTime = Date.now();
  
  try {
    // Import the AI SDK MCP client
    const { experimental_createMCPClient } = await import('ai');
    
    // Test MCP connectivity by creating a client
    const client = await experimental_createMCPClient({
      transport: {
        type: 'sse',
        url: url,
      },
    });

    try {
      // Try to get capabilities or tools to test the connection
      const toolSet = await client.tools();
      const responseTime = Date.now() - startTime;
      
      // Close the client
      await client.close();

      return {
        status: 'online',
        responseTime,
        statusCode: 200,
        message: `MCP server is online with ${Object.keys(toolSet).length} tools`,
      };
    } catch (clientError) {
      // Make sure to close the client even on error
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing MCP client during test:', closeError);
      }
      throw clientError;
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      return {
        status: 'timeout',
        responseTime,
        statusCode: null,
        message: 'MCP connection timed out after 10 seconds',
      };
    }
    
    let status = 'offline';
    let message = 'MCP server is not reachable';
    
    if (error.code === 'ECONNREFUSED') {
      message = 'MCP connection refused - server may be offline';
    } else if (error.code === 'ENOTFOUND') {
      message = 'MCP server hostname not found';
    } else if (error.message?.includes('404')) {
      status = 'error';
      message = 'MCP endpoint not found - check server URL';
    } else if (error.message) {
      message = `MCP error: ${error.message}`;
    }
    
    return {
      status,
      responseTime,
      statusCode: null,
      message,
    };
  }
}