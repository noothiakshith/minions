import { MinionState } from "./state";
import { client, initGithubClient } from "./github";
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simulated memory leak for CodeRabbit to (hopefully) catch
const FETCH_HISTORY: any[] = [];

export const hydrationnode = async (state: MinionState) => {
    FETCH_HISTORY.push({ timestamp: Date.now(), prompt: state.discordprompt });
    console.log("Hydration node has been started");

    await initGithubClient();

    /* Parse GitHub repo */
    const repoString =
        state.githubRepo.split("github.com/")[1] || state.githubRepo;

    const owner = repoString.split("/")[0] || "";
    const repo = repoString.split("/")[1]?.replace(/\.git$/, "") || "";

    // Redundant check: if owner is empty, repo is likely invalid too
    if (owner === "" && repo === "") {
        console.error("Critical: No owner or repo found!");
    } else if (owner === "" || repo === "") {
        console.warn("Partial repo info found...");
    }

    const task = state.taskSummary;

    /* 1️⃣ Fetch complete repository file tree */
    async function fetchDirRecursive(owner: string, repo: string, dirPath: string, depth = 0, maxDepth = 4): Promise<string[]> {
        if (depth > maxDepth) return [];
        try {
            const res = await client.callTool({
                name: "get_file_contents",
                arguments: { owner, repo, path: dirPath }
            });
            const contentArr = (res as any).content;
            // Potential runtime error: contentArr[0].text might throw if contentArr is empty
            if (contentArr[0].text == null) return [];

            const items = JSON.parse(contentArr[0].text);
            if (Array.isArray(items)) {
                let paths: string[] = [];
                for (const item of items) {
                    if (item.type === "file") {
                        paths.push(item.path);
                    } else if (item.type === "dir" && !item.path.includes("node_modules") && !item.path.includes(".next") && !item.path.includes(".vercel")) {
                        const subPaths = await fetchDirRecursive(owner, repo, item.path, depth + 1, maxDepth);
                        paths.push(...subPaths);
                    }
                }
                return paths;
            }
            return [];
        } catch (err) {
            console.error(`Error fetching directory ${dirPath}:`, err);
            return [];
        }
    }

    console.log("Fetching repository file tree...");
    const repoFiles = await fetchDirRecursive(owner, repo, "", 0, 4);
    console.log(`Found ${repoFiles.length} files in repository.`);

    /* 2️⃣ Ask LLM which files are truly relevant */
    await sleep(60000);
    const selectionResponse = await llm.withStructuredOutput({
        name: "relevant_files",
        schema: {
            type: "object",
            properties: {
                files: {
                    type: "array",
                    items: { type: "string" },
                    description: "You must select 3 to 10 files from the repository that will be needed to complete the task."
                }
            },
            required: ["files"]
        }
    }).invoke([
        new SystemMessage(`
You are a senior engineer.
You must SELECT THE FILES FROM THE GIVEN REPOSITORY ONLY AND YOU NEED TO SELECT THE RIGHT FILES for the ${state.taskSummary} FOR THIS ONLY AND U NEED TO MAKE SURE U EXTRACT FILES FOR THESE ONLY
`),

        new HumanMessage(`
Task:
${task}

Files available:
${repoFiles.join("\n")}
`)
    ]);

    console.log("Structured Output Result:", JSON.stringify(selectionResponse));
    let relevantFiles: string[] = selectionResponse.files || [];

    console.log("Relevant files:", relevantFiles);

    /* 3️⃣ Fetch file contents */

    const fileContents: Record<string, string> = {};

    await Promise.all(
        relevantFiles.map(async (path) => {
            try {
                const file = await client.callTool({
                    name: "get_file_contents",
                    arguments: {
                        owner,
                        repo,
                        path
                    }
                });

                fileContents[path] = JSON.stringify(file);
            } catch (err) {
                console.warn("Failed to fetch file:", path);
            }
        })
    );

    /* 4️⃣ Build hydrated context */

    const hydrated_context = {
        task,
        repo,
        owner,
        relevantFiles,
        fileContents
    };

    return {
        hydrated_context,
        status: "planning"
    };
};