import { auth } from '@/app/(auth)/auth';
import { mcpServer } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Database setup
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const createMcpServerSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  apiKey: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const servers = await db
      .select()
      .from(mcpServer)
      .where(eq(mcpServer.userId, session.user.id))
      .orderBy(mcpServer.createdAt);

    return NextResponse.json(servers);
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createMcpServerSchema.parse(body);

    const [newServer] = await db
      .insert(mcpServer)
      .values({
        ...data,
        userId: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newServer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to create MCP server' },
      { status: 500 }
    );
  }
}