import * as dotenv from 'dotenv';
dotenv.config();


import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { CustomClient } from './types';
import { errorTracker } from './core/errorTracker'; 
import { loadEvents } from './core/loadEvents';
import { loadInteractions } from './core/loadInteractions';
import { loadCommands } from './core/loadCommands'; 
import { deployCommands } from './core/deploy'; 
import { ACTIVITIES } from './config';
import { KeywordChecker } from './utils/keyword-checker'; 
import { processReactionQueue } from './utils/reactionQueueProcessor';


// LABEL: CLIENT INITIALIZATION
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember]
}) as CustomClient;

// LABEL: CUSTOM CLIENT PROPERTIES

// --- Mandatory Base Properties ---
client.commands = new Collection();
client.interactions = new Collection();
client.errorTracker = errorTracker;
client.interactionQueue = new Collection(); 
client.keywordChecker = new KeywordChecker();
client.reactionQueue = []; 

// --- Core Handlers Setup ---

// LABEL: Slash Command Execution Handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client); 
    } catch (error) {
        const errorId = client.errorTracker.trackError(error, 'command');
        console.error(`Error executing command ${interaction.commandName} (ID: ${errorId})`);
        
        const errorMessage = `An internal error occurred while running the command (ID: ${errorId}).`;
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMessage }).catch(() => {});
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
        }
    }
});

// LABEL: Component Interaction Execution Handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isMessageComponent() && !interaction.isModalSubmit()) return;

    let executed = false;
    for (const handler of client.interactions.values()) {
        const customIdMatch = typeof handler.customId === 'string'
            ? handler.customId === interaction.customId
            : handler.customId(interaction.customId);

        if (customIdMatch) {
            try {
                await handler.execute(interaction, client); 
                executed = true;
                break;
            } catch (error) {
                const errorId = client.errorTracker.trackError(error, 'unknown'); 
                console.error(`Error executing interaction ${interaction.customId} (ID: ${errorId})`);
                
                const errorMessage = `An internal error occurred during the interaction (ID: ${errorId}).`;
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: errorMessage }).catch(() => {});
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
                }
            }
        }
    }
});


// --- Initialization Sequence ---

async function startBot() {
    try {
        
        // LABEL: Handler Loading
        await loadCommands(client); 
        await loadEvents(client); 
        await loadInteractions(client); 

        await deployCommands(client); 
        
        // LABEL: Reaction Queue Processing Start
        setInterval(() => processReactionQueue(client), 1000); 

        // LABEL: Set Initial Presence
        client.user?.setActivity(ACTIVITIES[0].name, { type: ACTIVITIES[0].type });

        await client.login(process.env.BOT_TOKEN);
        console.log('[SUCCESS] Bot Client Logged In.');

    } catch (error) {
        const errorId = errorTracker.trackError(error, 'startup');
        console.error(`[ERROR] Fatal Bot Startup Error (ID: ${errorId})`);
        process.exit(1);
    }
}

startBot();