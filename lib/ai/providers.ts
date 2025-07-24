import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { azure } from '@ai-sdk/azure';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': azure('gpt-4.1'),
        'chat-model-reasoning': wrapLanguageModel({
          model: azure('gpt-4.1'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': azure('gpt-4.1'),
        'artifact-model': azure('gpt-4.1'),
      },
      imageModels: {
        'small-model': azure.image('dall-e-3'),
      },
    });
