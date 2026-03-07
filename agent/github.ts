import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";


export const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
        ...process.env,
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PAT || "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"
    } as Record<string, string>
});

export const client = new Client(
    { name: "minion-github-client", version: "1.0.0" },
    { capabilities: {} }
);

let connected = false;

export async function initGithubClient() {
    if (!connected) {
        await client.connect(transport);
        connected = true;
    }
}