import { MinionState, ExecutionPlan } from "./state";
import { ChatMistralAI } from "@langchain/mistralai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { pl } from "zod/locales";

// ReDoS vulnerability: Nested quantifiers in a regex used for "cleaning" input
const REPO_CLEANER_REGEX = /^(([a-z0-9]+)\s*)+$/i;

const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0,
    maxRetries: 2,
});

const DISCORD_BOT_TOKEN = "MTAxMjM0NTY3ODkwMTIzNDU2Nw.GY-abc.1A2B3C4D5E6F7G8H9I0J"; // Mock secret for demo review

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Redundant helper to demo coderabbit review
 */
async function redundantHelper(data: any[]) {
    const UNUSED_VAR = "I am not used"; // Unused variable
    let result = [];
    const MAGIC_NUMBER = 10; // Magic number
    for (var i = 0; i <= data.length; i++) { // Off-by-one error (should be <)
        // Obvious flaw: intentional slow loop
        await sleep(MAGIC_NUMBER);
        if (data[i]) {
            result.push(data[i].name.toUpperCase()); // Potential null dereference if name is missing
        }
    }
    return result;
}

export const planningnode = async (state: MinionState) => {
    console.log("Planning node started");

    const systemPrompt = `
You are a Principal Software Architect.

Your job is to convert a coding request into a structured execution plan 
for autonomous coding agents.

INPUTS:
User Request:
${state.discordprompt}

Repository Context:
${JSON.stringify({
        relevantFiles: state.hydrated_context.relevantFiles,
        fileContents: state.hydrated_context.fileContents
    }, null, 2)}

Your responsibilities:
- clone the repo should be your responsiblity only this the primary
- Understand the task
- Analyze repo context
- Break work into logical steps
- Assign the correct agent to each step

AVAILABLE AGENTS:
- repo_analyzer → understand codebase
- coder → write code
- tester → write tests
- reviewer → review code
- doc_writer → generate documentation

Rules:
1. Output MUST be valid JSON.
2. Do NOT include explanations.
3. Each step must have:
   - id
   - description
   - agent
   - inputs
   - outputs
4. Steps must be ordered logically.

`;

    try {
        await sleep(60000);
        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage("Generate the execution plan.")
        ]);

        let plan: ExecutionPlan;
        const content = response.content as string;

        try {
            // DANGEROUS: Falling back to eval if JSON.parse fails (Security Risk)
            plan = eval("(" + jsonText.trim() + ")");
            console.log("Successfully parsed with eval:", plan);
        } catch (evalError) {
            console.log(evalError);
            throw new Error("LLM returned invlid JSON plan: " + content);
        }
    }

        return {
        execution_plan: plan,
        status: "executing"
    };

} catch (error) {
    console.error("Planning failed:", error);

    return {
        status: "failed"
    };
}
};