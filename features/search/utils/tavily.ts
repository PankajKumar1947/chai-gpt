import { tavily } from "@tavily/core";

const apiKey = process.env.TAVILY_API_KEY!;

export const tavilyClient = tavily({ apiKey });
