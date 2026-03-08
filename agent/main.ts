import { StateGraph, START, END } from "@langchain/langgraph";
import { MessagesState, type MinionState } from "./state";
import { intent } from "./intent";
import { hydrationnode } from "./hydration";
import { planningnode } from "./planning";
import { codingnode } from "./coding";
import { prnode } from "./prnode";

const agent = new StateGraph(MessagesState)
    .addNode("intent", intent)
    .addNode("Planning", planningnode)
    .addNode("hydration", hydrationnode)
    .addNode("Coding", codingnode)
    .addNode("pr", prnode)
    .addEdge(START, "intent")
    .addEdge("intent", "hydration")
    .addEdge("hydration", "Planning")
    .addEdge("Planning", "Coding")
    .addEdge("Coding", "pr")
    .addEdge("pr", END);

export const app = agent.compile();

