import { REST, Routes } from 'discord.js';
import { errorTracker } from './errorTracker';
import { CustomClient } from '../types'; 

const TOKEN = process.env.BOT_TOKEN; 
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

console.log('[DEBUG] Environment variables:');
console.log('BOT_TOKEN:', TOKEN ? '✓ Set' : '✗ Not set');
console.log('CLIENT_ID:', CLIENT_ID ? '✓ Set' : '✗ Not set');
console.log('GUILD_ID:', GUILD_ID ? '✓ Set (optional)' : '✗ Not set (optional)');

export async function deployCommands(client: CustomClient): Promise<void> { 
    try {
        if (!CLIENT_ID || !TOKEN) {
             console.error('[DEPLOY] CLIENT_ID or DISCORD_TOKEN is missing. Aborting deployment.');
             return;
        }

        const commandsToDeploy = client.commands.map(cmd => cmd.data);
        
        const rest = new REST({ version: '10' }).setToken(TOKEN!);

        console.log(`[DEPLOY] Started refreshing ${commandsToDeploy.length} application (/) commands...`);

        const route = GUILD_ID 
            ? Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID) 
            : Routes.applicationCommands(CLIENT_ID!);

        const data: any = await rest.put(route, { body: commandsToDeploy });

        console.log(`[DEPLOY] Successfully reloaded ${data.length} application (/) commands.`);
        
    } catch (error) {
        const errorId = errorTracker.trackError(error, 'deployment', {
            additionalContext: {
                commandCount: client.commands.size,
                deploymentType: GUILD_ID ? 'guild' : 'global',
                reason: 'Failed to deploy commands to Discord API'
            }
        });
        console.error(`[DEPLOY] Deployment Error. Error ID: ${errorId}`);
        throw error;
    }
}