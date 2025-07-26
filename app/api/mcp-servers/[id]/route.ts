import { auth } from '@/app/(auth)/auth';
import { mcpServer } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Database setup
const postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl) {
  throw new Error('POSTGRES_URL environment variable is required');
}
const client = postgres(postgresUrl);
const db = drizzle(client);

const updateMcpServerSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  apiKey: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateMcpServerSchema.parse(body);
    const resolvedParams = await params;

    const [updatedServer] = await db
      .update(mcpServer)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mcpServer.id, resolvedParams.id),
          eq(mcpServer.userId, session.user.id)
        )
      )
      .returning();

    if (!updatedServer) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedServer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to update MCP server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const [deletedServer] = await db
      .delete(mcpServer)
      .where(
        and(
          eq(mcpServer.id, resolvedParams.id),
          eq(mcpServer.userId, session.user.id)
        )
      )
      .returning();

    if (!deletedServer) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCP server' },
      { status: 500 }
    );
  }
}