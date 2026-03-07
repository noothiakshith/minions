import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { MinionState } from "./state";
import { ChatMistralAI } from "@langchain/mistralai";
import { z } from "zod";

const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0,
    maxRetries: 2,
});

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
        const response = await structuredLLM.invoke([
            new SystemMessage(SystemPrompt),
            new HumanMessage(state.discordprompt),
        ]);

        console.log(response);

        return {
            githubRepo: response.githubRepo,
            status: "planning"
        };
    } catch (error) {
        console.log(error);
        return {
            status: "failed"
        };
    }
};