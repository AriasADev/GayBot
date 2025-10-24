import { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Message, 
    PartialMessage, 
    Interaction, 
    Collection 
} from 'discord.js';
import * as dotenv from "dotenv";
dotenv.config()

import { loadCommands } from './core/deploy'; 
import { IApplicationCommand } from './core/IApplicationCommand'; 

import { KeywordChecker } from './keyword-checker';
import { ObjectAny, QueueEntry } from './types';

// --- Configuration and Setup --


interface CustomClient extends Client {
    commands: Collection<string, IApplicationCommand>;
}

const DISCORD_TOKEN = process.env.BOT_TOKEN; 

const keywordChecker = new KeywordChecker();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
}) as CustomClient;

client.commands = new Collection<string, IApplicationCommand>();


// --- Core ---

const reactionQueue: QueueEntry[] = [];
let isProcessingQueue = false;

async function handleMessageKeywords(message: Message | PartialMessage) {
    if (message.partial) {
        try {
            message = await message.fetch();
        } catch (error) {
            console.error('Could not fetch partial message for content check:', error);
            return; 
        }
    }
    
    if (!message.content || message.author.bot) return;

    const matchingEmojis = keywordChecker.getMatchingEmojis(message.content);

    if (matchingEmojis.length > 0) {
        console.log(`Keywords matched in message ID ${message.id}. Emojis: ${matchingEmojis.join(', ')}`);
        
        for (const emoji of matchingEmojis) {
            reactionQueue.push({
                message: message,
                emoji: emoji
            });
        }
    }
}


async function processReactionQueue() {
    if (isProcessingQueue || reactionQueue.length === 0) {
        return;
    }

    isProcessingQueue = true;
    const entry = reactionQueue.shift();
    
    if (entry) {
        try {
            console.log(`Reacting with ${entry.emoji} to message ID ${entry.message.id}`);
            const message = await entry.message.fetch();
            
            await message.react(entry.emoji);
        } catch (error) {
            console.error(`Error reacting with ${entry.emoji}:`, error);
        }
    }

    isProcessingQueue = false;
    if (reactionQueue.length > 0) {
        setTimeout(processReactionQueue, 500); 
    }
}

// --- Discord Event Handlers ---

client.once('clientReady', async () => {
    console.log(`🚀 Bot is ready! Logged in as ${client.user?.tag}`);
    
    await loadCommands(client);
    
    setInterval(processReactionQueue, 1000); 
});


client.on('messageCreate', (message: Message) => {
    handleMessageKeywords(message);
});


client.on('messageUpdate', (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
    handleMessageKeywords(newMessage);
});


// Handle slash command interactions

client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isCommand()) return;
    
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} found in collection.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        
        const errorMessage = { content: 'There was an error executing this command!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});


client.on('error', (error) => {
    console.error('A client error occurred:', error);
});


client.login(DISCORD_TOKEN).catch(err => {
    console.error("Failed to login to Discord. Check your BOT_TOKEN.", err);
});