import { StateGraph, START, END } from "@langchain/langgraph";
import { MessagesState, type MinionState } from "./state";
import { intent } from "./intent";
import { hydrationnode } from "./hydration";
import { planningnode } from "./planning";

const agent = new StateGraph(MessagesState)
    .addNode("intent", intent)
    .addNode("Planning",planningnode)
    .addNode("hydration",hydrationnode)
    .addEdge(START, "intent")
    .addEdge("intent","hydration")
    .addEdge("hydration","Planning")
    .addEdge("Planning", END);

export const app = agent.compile();

