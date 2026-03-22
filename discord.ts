import { Client, GatewayIntentBits, Events } from 'discord.js';
import * as dotenv from 'dotenv';
import { app } from './agent/main';
import 'dotenv/config';
import { Sandbox } from '@e2b/code-interpreter';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // REQUIRED to read your prompt
    ],
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    // 1. Ignore messages from bots
    if (message.author.bot) return;

    // 2. Only trigger if the bot is mentioned
    if (!message.mentions.has(client.user!)) return;

    // 3. Clean the prompt (remove the @mention)
    const prompt = message.content.replace(/<@!?\d+>/, '').trim();

    if (!prompt) {
        message.reply("I'm listening! Give me a task, e.g., '@Minion fix the login bug in issue #42'");
        return;
    }

    const statusMessage = await message.reply("🛠️ **Minion Task Received.** Initializing MCP Hydration...");
    
    try {
        const sandbox = await Sandbox.create("akshith-dev", {
            envs: {
                GITHUB_TOKEN: process.env.GITHUB_PAT!,
                MISTRAL_API_KEY: process.env.MISTRAL_API_KEY!,
            },
            onStdout: (output) => {
                console.log(`Sandbox stdout: ${output.line}`);
                message.channel.send(`[Sandbox Output] ${output.line}`);
            },
            onStderr: (error) => {
                console.error(`Sandbox stderr: ${error.line}`);
                message.channel.send(`[Sandbox Error] ${error.line}`);
            }
        });
        
        const sandboxId = sandbox.sandboxId;
        console.log(`Sandbox Created: ${sandboxId}`);
        await message.reply(`The sandbox of id ${sandboxId} has been created`);

        const responseState = await app.invoke({
            discordprompt: prompt,
            taskSummary: "",
            githubRepo: "",
            hydrated_context: {
                task: "",
                repo: "",
                owner: "",
                relevantFiles: [],
                fileContents: {}
            },
            execution_plan: {
                steps: []
            },
            retry_count: 0,
            status: "intent",
            sandboxId: sandboxId
        });
        
        // Log the response state for debugging
        console.log("Response State:", responseState);
    } catch (error) {
        console.error("Error in processing:", error);
        await message.reply("❌ **Error occurred while processing your request.** Please check the logs.");
    }
});

client.login(process.env.DISCORD_TOKEN);