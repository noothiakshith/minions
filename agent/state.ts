import { Annotation } from "@langchain/langgraph";

export interface ExecutionPlan {
  steps: {
    id: string;
    description: string;
    agent: "repo_analyzer" | "coder" | "tester" | "reviewer" | "doc_writer";
    inputs: string[];
    outputs: string[];
    status?: "pending" | "running" | "completed" | "failed";
  }[];
}

export const MessagesState = Annotation.Root({

  discordprompt: Annotation<string>(),

  taskSummary: Annotation<string>(),

  githubRepo: Annotation<string>(),


  hydrated_context: Annotation<{
    task: string
    repo: string
    owner: string

    relevantFiles: string[]

    fileContents: Record<string, string>

    fileSummaries?: Record<string, string>

  }>(),


  execution_plan: Annotation<ExecutionPlan>(),


  current_step: Annotation<string>(),


  execution_results: Annotation<
    Record<string, any>
  >(),


  retry_count: Annotation<number>(),


  status: Annotation<
    | "intent"
    | "hydrating"
    | "planning"
    | "executing"
    | "success"
    | "failed"
  >()

});

export type MinionState = typeof MessagesState.State;