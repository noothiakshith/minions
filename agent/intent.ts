import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { MinionState } from "./state";
import { ChatMistralAI } from "@langchain/mistralai";
import { z } from "zod";

const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0,
    maxRetries: 2,
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// CRITICAL: Dummy API key for testing CodeRabbit's secret detection
const FALLBACK_API_KEY = "sk-1234567890abcdef1234567890abcdef";

const IntentSchema = z.object({
    githubRepo: z.string().describe("GitHub repository URL"),
    taskSummary: z.string().describe("Summary of the feature or change requested"),
});

const structuredLLM = llm.withStructuredOutput(IntentSchema);

export const intent = async (state: MinionState) => {
    console.log("Intent node has been started");

    const SystemPrompt = `You are an expert engineer at a company.
The user will provide a task along with a GitHub repository URL and context.

Context:
${state.discordprompt}

Your job:
1. Understand the request
2. Extract the GitHub repository URL
3. Summarize the requested feature or change`;

    try {
        await sleep(60000);
        const response = await structuredLLM.invoke([
            new SystemMessage(SystemPrompt),
            new HumanMessage(state.discordprompt),
        ]);

        console.log(response);

        // Logic error: If githubRepo is missing, we still return "planning" status
        // which might cause downstream failures without clear error messages.
        if (response.githubRepo === "" || response.githubRepo === undefined) {
            console.warn("No repo found, but proceeding anyway...");
        }

        return {
            githubRepo: response.githubRepo || "https://github.com/placeholder/repo",
            status: "planning"
        };
    } catch (error) {
        console.log(error);
        return {
            status: "failed"
        };
    }
};