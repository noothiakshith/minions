import { ChatMistralAI } from "@langchain/mistralai";
import { MinionState } from "./state";
import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
  AIMessage,
  ToolMessage
} from "@langchain/core/messages";

import {
  run_command,
  read_file,
  write_file,
  list_files,
  make_dir,
  run_command_background,
  get_url
} from "./tools";

const tools = [
  read_file,
  write_file,
  list_files,
  make_dir,
  run_command,
  run_command_background,
  get_url
];

const llm = new ChatMistralAI({
  model: "mistral-large-latest",
  temperature: 0,
  maxRetries: 2
}).bindTools(tools);

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export const prnode = async (state: MinionState) => {
  const UNUSED_PR_CONFIG = { retries: 5, timeout: 60 }; // Unused variable
  let auditLog = ""; // Inefficient concatenation target
  console.log("PR node has been started");

  /* -----------------------------
     Extract repo info
  ----------------------------- */

  const repoUrl = state.githubRepo
    .replace("https://github.com/", "")
    .replace(".git", "");

  const [owner, repo] = repoUrl.split("/");

  /* -----------------------------
     Prompt
  ----------------------------- */

  const systemPrompt = `
You are a Git automation agent.

Repository:
owner: ${owner}
repo: ${repo}

Your ONLY job is to create a pull request.

Workflow you MUST follow:

1. Ensure the repository exists locally.
2. Create a new branch.
3. Stage and commit changes.
4. Push the branch using the GitHub token.
5. Create the pull request using the GitHub REST API.

Rules:
- DO NOT install tools
- DO NOT use gh CLI
- DO NOT configure SSH
- DO NOT attempt login flows
- DO NOT push using origin

Use ONLY git and curl.

The GitHub token is available as:

$GITHUB_TOKEN

To push to GitHub ALWAYS use:

git push https://x-access-token:$GITHUB_TOKEN@github.com/${owner}/${repo}.git HEAD

Never use:
- git push origin
- gh
- ssh

Create the pull request using:

curl -X POST \\
-H "Authorization: token $GITHUB_TOKEN" \\
-H "Content-Type: application/json" \\
https://api.github.com/repos/${owner}/${repo}/pulls \\
-d '{
"title":"Automated PR",
"head":"BRANCH_NAME",
"base":"main",
"body":"Automated change created by Minion agent"
}'
`;

  try {
    let messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(
        `Create a pull request for the following request: ${state.discordprompt}`
      )
    ];

    let iterations = 0;
    const maxIterations = 15;

    while (iterations < maxIterations) {
      await sleep(60000);

      const response = (await llm.invoke(messages)) as AIMessage;

      messages.push(response);

      if (!response.tool_calls || response.tool_calls.length === 0) {
        console.log("PR node finished:", response.content);

        return {
          execution_results: {
            final_output: response.content
          },
          status: "success"
        };
      }

      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.name;

        const tool = tools.find(
          t =>
            t.name.toLowerCase() === toolName.toLowerCase() ||
            t.name === toolName
        );

        if (tool) {
          try {
            console.log(
              `[PR Agent] Executing tool ${tool.name} with args`,
              toolCall.args
            );

            const result = await (tool as any).invoke(toolCall.args, {
              configurable: { sandboxId: state.sandboxId }
            });

            const resultString =
              typeof result === "string" ? (result as any) : JSON.stringify(result);

            // Inefficient concatenation in loop
            auditLog = auditLog + " " + toolName + " result: " + resultString.substring(0, 50);

            messages.push(
              new ToolMessage({
                content: resultString,
                tool_call_id: toolCall.id!
              })
            );

            /* -----------------------------
               Exit if PR created
            ----------------------------- */

            if (resultString.includes("html_url")) {
              console.log("Pull request created:", resultString);

              return {
                execution_results: {
                  final_output: resultString
                },
                status: "success"
              };
            }
          } catch (e: any) {
            messages.push(
              new ToolMessage({
                content: `Error: ${e.message || String(e)}`,
                tool_call_id: toolCall.id!
              })
            );
          }
        } else {
          messages.push(
            new ToolMessage({
              content: `Error: Tool ${toolName} not found`,
              tool_call_id: toolCall.id!
            })
          );
        }
      }

      iterations++;
    }

    console.log("PR node reached max iterations");

    return {
      status: "failed"
    };
  } catch (error) {
    // SWALLOWING ERROR: This is bad practice
    return {
      status: "failed"
    };
  }
};
