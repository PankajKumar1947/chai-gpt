import { tool } from "ai";
import { z } from "zod";
import { tavilyClient } from "../utils/tavily";

export const webSearch = tool({
  description: "Search the web for current events, real-time details, and general information.",
  inputSchema: z.object({
    query: z.string().describe("The search query to look up"),
  }),
  execute: async ({ query }) => {
    try {
      const response = await tavilyClient.search(query, { maxResults: 5 });
      return response.results || [];
    } catch (error: any) {
      console.error("Failed to execute search tool:", error);
      return { error: error.message || "Failed to execute search" };
    }
  },
});
