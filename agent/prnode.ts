import { ChatMistralAI } from "@langchain/mistralai";
import { MinionState } from "./state";
import { HumanMessage, SystemMessage, BaseMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { run_command, read_file, write_file, list_files, make_dir, run_command_background, get_url } from "./tools";

const tools = [read_file, write_file, list_files, make_dir, run_command, run_command_background, get_url];

const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0,
    maxRetries: 2
}).bindTools(tools);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const prnode = async (state: MinionState) => {
    console.log("PR node has been started");
    const systemPrompt = `You are an expert PR Agent.
Your main purpose is to create a pull request to the repository ${state.githubRepo}.
You are given all the tools to manage files and run commands. You should use them wisely.
The github token is active and it has all permissions to create a pull request.
You can run commands like 'git', 'gh', etc. to create the PR.
The sandbox environment is already set up and likely the repository is already cloned from previous steps, but you should verify or clone it if needed.
Use the 'cwd' parameter in 'run_command' to specify the working directory of the repository.

Previous context:
Task Summary: ${state.taskSummary}
Final Coding Result: ${JSON.stringify(state.execution_results)}

Plan:
1. List files to see the current state of the repo.
2. Create a new branch if needed.
3. Commit any changes created by the coding agent.
4. Push the branch to the remote.
5. Create a pull request using the 'gh pr create' command or similar.

IMPORTANT:
1. Always check if you are in the correct directory.
2. If you need to clone, do so.
3. Be efficient.`;

    try {
        let messages: BaseMessage[] = [
            new SystemMessage(systemPrompt),
            new HumanMessage(`Create a pull request for the following request: ${state.discordprompt}`)
        ];

        let iterations = 0;
        const maxIterations = 20;

        while (iterations < maxIterations) {
            const response = (await llm.invoke(messages)) as AIMessage;
            messages.push(response);

            if (!response.tool_calls || response.tool_calls.length === 0) {
                console.log("PR node finished:", response.content);
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
                        console.log(`[PR Agent] Executing tool ${tool.name} with args`, toolCall.args);
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
            await sleep(2000);
        }

        console.log("PR node reached max iterations");
        return {
            status: "failed"
        };
    } catch (error) {
        console.log("PR node error:", error);
        return {
            status: "failed"
        };
    }
}