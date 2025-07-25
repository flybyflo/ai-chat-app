import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
  getActiveMcpServersByUserId,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { createChart } from '@/lib/ai/tools/create-chart';
import { getMCPTools, type MCPServerConfig } from '@/lib/ai/mcp-client';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { Chat } from '@/lib/db/schema';
import { differenceInSeconds } from 'date-fns';
import { ChatSDKError } from '@/lib/errors';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const previousMessages = await getMessagesByChatId({ id });

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message,
    });

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createDataStream({
      execute: async (dataStream) => {
        // Get user's active MCP servers and load tools
        let mcpTools = {};

        try {
          console.log('🔄 Loading MCP tools from user servers...');
          
          // Get active MCP servers for the user
          const userMcpServers = await getActiveMcpServersByUserId({ 
            userId: session.user.id 
          });

          if (userMcpServers.length > 0) {
            console.log(`Found ${userMcpServers.length} active MCP servers for user`);
            
            // Convert database format to MCP client format
            const mcpServerConfigs: MCPServerConfig[] = userMcpServers.map(server => ({
              id: server.id,
              name: server.name,
              url: server.url,
              apiKey: server.apiKey,
              isActive: server.isActive,
            }));

            // Load tools from all active servers
            mcpTools = await getMCPTools(mcpServerConfigs);

            const toolCount = Object.keys(mcpTools).length;
            if (toolCount > 0) {
              console.log(`✅ Loaded ${toolCount} MCP tools from ${userMcpServers.length} servers`);
            }
          } else {
            console.log('No active MCP servers found for user, trying environment fallback...');
            // Fallback to environment variable for backward compatibility
            mcpTools = await getMCPTools();
            
            const toolCount = Object.keys(mcpTools).length;
            if (toolCount > 0) {
              console.log(`✅ Loaded ${toolCount} MCP tools from environment fallback`);
            }
          }
        } catch (error) {
          console.warn('⚠️  Failed to load MCP tools:', error);
        }

        // Combine regular tools with auto-discovered MCP tools
        const regularTools = {
          getWeather,
          createChart,
          createDocument: createDocument({ session, dataStream }),
          updateDocument: updateDocument({ session, dataStream }),
          requestSuggestions: requestSuggestions({
            session,
            dataStream,
          }),
        };

        console.log('📋 Regular tools registered:', Object.keys(regularTools));

        const allTools = {
          ...regularTools,
          ...mcpTools,
        };

        // Get all available tool names
        const availableToolNames = Object.keys(allTools);
        const regularToolNames = Object.keys(regularTools);
        const mcpToolNames = Object.keys(mcpTools);

        console.log(`🛠️  Available tools: ${availableToolNames.length} total 
          (${regularToolNames.length} regular, ${mcpToolNames.length} MCP)`);
        console.log('📋 All available tool names:', availableToolNames);

        if (mcpToolNames.length > 0) {
          console.log('🔗 MCP tools:', mcpToolNames);
        }

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : (availableToolNames as any[]),
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: allTools,
          onFinish: async ({ response, steps }) => {
            if (session.user?.id) {
              try {
                console.log('🔄 onFinish called with response:', {
                  messageCount: response.messages.length,
                  messageRoles: response.messages.map(m => m.role),
                  assistantMessages: response.messages.filter(m => m.role === 'assistant').length,
                  stepsCount: steps?.length || 0,
                  hasSteps: !!steps,
                  steps: steps ? steps.map(s => ({ stepType: s.stepType, toolCalls: s.toolCalls?.map(tc => tc.toolName) })) : null
                });

                const assistantMessages = response.messages.filter(
                  (message) => message.role === 'assistant',
                );

                const assistantId = getTrailingMessageId({
                  messages: assistantMessages,
                });

                console.log('🔍 Assistant messages found:', assistantMessages.length, 'Assistant ID:', assistantId);

                if (!assistantId) {
                  console.error('❌ No assistant message found! Response messages:', response.messages);
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                });

                // Log multi-step execution details for debugging
                if (steps && steps.length >= 1) {
                  console.log(
                    `Execution completed with ${steps.length} steps`,
                  );
                  const allToolCalls = steps.flatMap(
                    (step) => step.toolCalls || [],
                  );
                  if (allToolCalls.length > 0) {
                    console.log(
                      `Total tool calls across all steps: ${allToolCalls.length}`,
                    );
                    console.log('Tool calls details:', allToolCalls.map(tc => ({
                      toolName: tc.toolName,
                      hasResult: !!tc.result,
                      args: tc.args
                    })));
                  }
                  
                  // Log each step
                  steps.forEach((step, index) => {
                    console.log(`Step ${index + 1}:`, {
                      stepType: step.stepType,
                      toolCallsCount: step.toolCalls?.length || 0,
                      hasText: !!step.text,
                      text: step.text?.slice(0, 100) + (step.text?.length > 100 ? '...' : ''),
                    });
                  });
                }

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (error) {
                console.error('Failed to save chat:', error);
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      );
    } else {
      return new Response(stream);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('bad_request:chat').toResponse();
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
