import { ChatMistralAI } from "@langchain/mistralai";
import { MinionState } from "./state";
import { read_file, write_file, list_files, make_dir, run_command, run_command_background, get_url } from "./tools";
import { HumanMessage, SystemMessage, BaseMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

const tools = [read_file, write_file, list_files, make_dir, run_command, run_command_background, get_url];
const llm = new ChatMistralAI({
    model: 'mistral-large-latest',
    temperature: 0,
    maxRetries: 2
}).bindTools(tools);

export const codingnode = async (state: MinionState) => {
    console.log("Coding node has been started");
    const systemPrompt = `You are an expert Coding Expert in all web development tasks across all tech stacks. Now your task is to review the execution plan: ${JSON.stringify(state.execution_plan)} and complete the tasks that can be done by you. The main goal for the user is: ${state.discordprompt}. You have the context for the repo: ${JSON.stringify(state.hydrated_context)}, and the github repo is ${state.githubRepo}. You have various tools at your disposal, and you can leverage them to fully complete the task. Your main initial responsibility is to clone the repo inside the sandbox. The summary is ${state.taskSummary}. Start building.`;

    try {
        let messages: BaseMessage[] = [
            new SystemMessage(systemPrompt),
            new HumanMessage(state.discordprompt)
        ];

        let iterations = 0;
        const maxIterations = 50;

        while (iterations < maxIterations) {
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