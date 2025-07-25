import { auth } from '@/app/(auth)/auth';
import { McpSettingsWrapper } from './mcp-settings-wrapper';
import { getMcpServersByUserId } from '@/lib/db/queries';

interface McpSettingsProviderProps {
  children: React.ReactNode;
}

export async function McpSettingsProvider({
  children,
}: McpSettingsProviderProps) {
  const session = await auth();

  // Only fetch servers if user is authenticated
  const servers = session?.user
    ? await getMcpServersByUserId({ userId: session.user.id })
    : [];

  return <McpSettingsWrapper servers={servers}>{children}</McpSettingsWrapper>;
}
