import { MinionState, ExecutionPlan } from "./state";
import { ChatMistralAI } from "@langchain/mistralai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { pl } from "zod/locales";

const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0,
    maxRetries: 2,
});

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
${state.hydrated_context}

Your responsibilities:
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
        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage("Generate the execution plan.")
        ]);

        let plan: ExecutionPlan;
        const content = response.content as string;

        try {
            let jsonText = content;
            const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            if (match && match[1]) {
                jsonText = match[1];
            } else {
                const firstBrace = content.indexOf('{');
                const lastBrace = content.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
                    jsonText = content.substring(firstBrace, lastBrace + 1);
                }
            }
            plan = JSON.parse(jsonText.trim());
            console.log(plan);
        } catch (e) {
            console.log(e);
            throw new Error("LLM returned invalid JSON plan: " + content);
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