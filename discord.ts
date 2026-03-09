import { Client, GatewayIntentBits, Events } from 'discord.js';
import * as dotenv from 'dotenv';
import { app } from './agent/main'
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
    const sandbox = await Sandbox.create("akshith-dev", {
        envs: {
            GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
            MISTRAL_API_KEY: process.env.MISTRAL_API_KEY!,
        }
    })
    const sandboxId = sandbox.sandboxId;
    console.log(` Sandbox Created: ${sandboxId}`);
    message.reply(`The sandbox of id ${sandboxId} has been created`);

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


});

client.login(process.env.DISCORD_TOKEN);