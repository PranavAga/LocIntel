import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, tool } from 'ai';
import { z } from 'zod';

export const runtime = 'edge';

// Define the search location tool
const searchLocation = tool({
  description: 'Search for locations and get GeoJSON polygons using Nominatim',
  inputSchema: z.object({
    query: z.string().describe('The location or places to search for (e.g., "Paris, France", "Central Park")'),
  }),
  execute: async ({ query }) => {
    try {
      // Use Nominatim API to search for locations
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=geojson&polygon_geojson=1&limit=5`
      );
      
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }
      
      const geojson = await response.json();
      console.log('Nominatim response:', geojson);
      return {
        success: true,
        data: geojson,
        count: geojson.features?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  },
});

export async function POST(req) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-5-mini'),
    system: `
You are a helpful and conversational geographic assistant. Your main goal is to help users find and discover great locations.

You have one tool: searchLocation. You should use this tool to get GeoJSON data whenever you are finding places for the user.

Here are your general guidelines:

For Recommendation Requests: When a user asks for recommendations (like "find me some parks" or "I need a cozy cafe"), it's your job to come up with a few good suggestions. Once you have your suggestions, use the searchLocation tool to get the data for the specific places you recommended.

For Specific "Find" Requests: If the user just wants to find a specific, named location (like "Eiffel Tower" or "123 Main St"), simply use the searchLocation tool to find it.

Be Flexible: Use your best judgment on what to search for to be most helpful. The goal is to provide the user with a great, conversational answer backed up by the location data from your tool.`,
    messages: convertToModelMessages(messages),
    tools: {
      searchLocation,
    },
  });

  return result.toUIMessageStreamResponse();
}