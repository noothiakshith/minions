import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  env: {
    ...process.env,
    GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || ""
  } as Record<string, string>
});

const client = new Client(
  { name: "test-client", version: "1.0.0" },
  { capabilities: {} }
);

async function fetchDirRecursive(owner: string, repo: string, dirPath: string, depth = 0, maxDepth = 4): Promise<string[]> {
  if (depth > maxDepth) return [];
  try {
    const res = await client.callTool({
      name: "get_file_contents",
      arguments: { owner, repo, path: dirPath }
    });
    const contentArr = (res as any).content;
    if (!contentArr || !contentArr[0] || !contentArr[0].text) return [];

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
    return [];
  }
}

async function main() {
  await client.connect(transport);
  const paths = await fetchDirRecursive("noothiakshith", "lovable", "", 0, 4);
  console.log("Paths:", paths.length);
  process.exit(0);
}
main();
