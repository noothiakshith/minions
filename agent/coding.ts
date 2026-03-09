import { ChatMistralAI } from "@langchain/mistralai";
import { MinionState } from "./state";
import { ChatOllama } from "@langchain/ollama"
import { read_file, write_file, list_files, make_dir, run_command, run_command_background, get_url } from "./tools";
import { HumanMessage, SystemMessage, BaseMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import * as dotenv from 'dotenv'
const tools = [read_file, write_file, list_files, make_dir, run_command, run_command_background, get_url];

dotenv.config()
const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    apiKey: process.env.MISTRAL_API_KEY,
}).bindTools(tools);


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const codingnode = async (state: MinionState) => {
    console.log("Coding node has been started");
    const systemPrompt = `You are an expert Coding Expert. 
Your task is to review the execution plan: ${JSON.stringify(state.execution_plan)} and complete it.
User Goal: ${state.discordprompt}
Summary: ${state.taskSummary}
GitHub Repo: ${state.githubRepo}

You have access to the following relevant files (already identified): ${state.hydrated_context.relevantFiles.join(", ")}.

IMPORTANT: 
1. You MUST clone the repo inside the sandbox FIRST.
2. ALL subsequent commands (installing dependencies, running tests, etc.) MUST be executed ONLY inside the cloned repository directory.
3. Use the 'cwd' parameter in 'run_command' and 'run_command_background' to specify the cloned repository's folder path.
4. You can use tools like 'read_file' to see the content of any file. Do not assume you know the content until you read it or clone it.
5. Be efficient and thorough.`;

    try {
        let messages: BaseMessage[] = [
            new SystemMessage(systemPrompt),
            new HumanMessage(state.discordprompt)
        ];

        let iterations = 0;
        const maxIterations = 50;

        while (iterations < maxIterations) {
            await sleep(60000); // Wait between requests to avoid rate limits
            const response = (await llm.invoke(messages)) as AIMessage;
            messages.push(response);

            if (!response.tool_calls || response.tool_calls.length === 0) {
                console.log("Coding node finished:", response.content);
                return {
                    execution_results: { final_output: response.content },
                    status: "success"
                };
            }

            for (const toolCall of response.tool_calls) {
                const toolName = toolCall.name;
                const tool = tools.find((t) => t.name.toLowerCase() === toolName.toLowerCase() || t.name === toolName);
                if (tool) {
                    try {
                        console.log(`[Coding Agent] Executing tool ${tool.name} with args`, toolCall.args);
                        const result = await (tool as any).invoke(toolCall.args, {
                            configurable: { sandboxId: state.sandboxId }
                        });
                        messages.push(new ToolMessage({
                            content: typeof result === 'string' ? result : JSON.stringify(result),
                            tool_call_id: toolCall.id!
                        }));
                    } catch (e: any) {
                        messages.push(new ToolMessage({
                            content: `Error: ${e.message || String(e)}`,
                            tool_call_id: toolCall.id!
                        }));
                    }
                } else {
                    messages.push(new ToolMessage({
                        content: `Error: Tool ${toolName} not found`,
                        tool_call_id: toolCall.id!
                    }));
                }
            }

            iterations++;
            await sleep(60000); // Wait 60 seconds between iterations to avoid Rate Limits
        }

        console.log("Coding node reached max iterations");
        return {
            execution_results: { final_output: "Max iterations reached", messages: messages.map(m => m.content) },
            status: "failed"
        };
    } catch (error) {
        console.log("Coding node error:", error);
        return {
            status: "failed"
        };
    }
};