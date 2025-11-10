import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';

export const runtime = 'edge';

export async function POST(req) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-5-mini'),
    system: 'You are a helpful assistant.',
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}