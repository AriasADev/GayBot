import { Client, ClientOptions, GatewayIntentBits, Partials, Message, PartialMessage } from 'discord.js';
import { KeywordChecker } from './keyword-checker';
import { ObjectAny, QueueEntry } from './types';

// --- Configuration and Setup --



const DISCORD_TOKEN = '[no lul]'; 

const keywordChecker = new KeywordChecker();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
});

const reactionQueue: QueueEntry[] = [];
let isProcessingQueue = false;

// --- Core ---

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

client.once('clientReady', () => {
    console.log(`🚀 Bot is ready! Logged in as ${client.user?.tag}`);
    setInterval(processReactionQueue, 1000); 
});


client.on('messageCreate', (message: Message) => {
    handleMessageKeywords(message);
});


client.on('messageUpdate', (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {

    handleMessageKeywords(newMessage);
});

client.on('error', (error) => {
    console.error('A client error occurred:', error);
});



client.login(DISCORD_TOKEN).catch(err => {
    console.error("Failed to login to Discord. Check your DISCORD_TOKEN.", err);
});