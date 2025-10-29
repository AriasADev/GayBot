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
import { errorTracker } from './core/errorTracker';

import { KeywordChecker } from './keyword-checker';
import { ObjectAny, QueueEntry } from './types';

// --- Configuration and Setup ---


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
    try {
        if (message.partial) {
            try {
                message = await message.fetch();
            } catch (error) {
                const errorId = errorTracker.trackError(error, 'messageUpdate', {
                    message,
                    additionalContext: {
                        reason: 'Failed to fetch partial message'
                    }
                });
                console.error(`Could not fetch partial message. Error ID: ${errorId}`);
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
    } catch (error) {
        const errorId = errorTracker.trackError(error, 'messageCreate', {
            message,
            additionalContext: {
                reason: 'Error in handleMessageKeywords'
            }
        });
        console.error(`Error handling message keywords. Error ID: ${errorId}`);
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
            const errorId = errorTracker.trackError(error, 'reaction', {
                message: entry.message,
                additionalContext: {
                    emoji: entry.emoji,
                    reason: 'Failed to add reaction'
                }
            });
            console.error(`Error reacting with ${entry.emoji}. Error ID: ${errorId}`);
        }
    }

    isProcessingQueue = false;
    if (reactionQueue.length > 0) {
        setTimeout(processReactionQueue, 500); 
    }
}

// --- Discord Event Handlers ---

client.once('clientReady', async () => {
    try {
        console.log(`🚀 Bot is ready! Logged in as ${client.user?.tag}`);
        
        await loadCommands(client);
        
        setInterval(processReactionQueue, 1000);
    } catch (error) {
        const errorId = errorTracker.trackError(error, 'startup', {
            additionalContext: {
                reason: 'Error during bot startup'
            }
        });
        console.error(`Error during startup. Error ID: ${errorId}`);
        process.exit(1);
    }
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
        // Build additional context
        const additionalContext: Record<string, any> = {
            reason: 'Command execution failed'
        };
        
        // Only add options if this is a ChatInputCommandInteraction
        if (interaction.isChatInputCommand()) {
            additionalContext.commandOptions = interaction.options.data;
        }
        
        const errorId = errorTracker.trackError(error, 'command', {
            command: interaction.commandName,
            interaction,
            additionalContext
        });
        
        console.error(`Error executing command: ${interaction.commandName}. Error ID: ${errorId}`);
        
        const errorMessage = { 
            content: `❌ **Command Error**\n\n` +
                     `An error occurred while executing this command.\n\n` +
                     `**Error ID:** \`${errorId}\`\n\n` +
                     `Please report this ID to a bot administrator for assistance.`, 
            ephemeral: true 
        };
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (replyError) {
            const replyErrorId = errorTracker.trackError(replyError, 'command', {
                command: interaction.commandName,
                interaction,
                additionalContext: {
                    reason: 'Failed to send error message to user',
                    originalErrorId: errorId
                }
            });
            console.error(`Failed to send error message to user. Error ID: ${replyErrorId}`);
        }
    }
});


client.on('error', (error) => {
    const errorId = errorTracker.trackError(error, 'unknown', {
        additionalContext: {
            reason: 'Discord client error event'
        }
    });
    console.error(`A client error occurred. Error ID: ${errorId}`);
});


client.login(DISCORD_TOKEN).catch(err => {
    const errorId = errorTracker.trackError(err, 'startup', {
        additionalContext: {
            reason: 'Failed to login to Discord. Check your BOT_TOKEN.'
        }
    });
    console.error(`Failed to login to Discord. Error ID: ${errorId}`);
});