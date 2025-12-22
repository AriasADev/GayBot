import { REST, Routes } from 'discord.js';
import { errorTracker } from './errorTracker';
import { CustomClient } from '../types'; 

const TOKEN = process.env.BOT_TOKEN; 
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // If set, we are in "Dev Mode"

console.log('[DEBUG] Environment variables:');
console.log('BOT_TOKEN:', TOKEN ? '✓ Set' : '✗ Not set');
console.log('CLIENT_ID:', CLIENT_ID ? '✓ Set' : '✗ Not set');
console.log('GUILD_ID:', GUILD_ID ? `✓ Set (Dev Mode: ${GUILD_ID})` : '✗ Not set (Production Mode)');

export async function deployCommands(client: CustomClient): Promise<void> { 
    try {
        if (!CLIENT_ID || !TOKEN) {
             console.error('[DEPLOY] CLIENT_ID or DISCORD_TOKEN is missing. Aborting deployment.');
             return;
        }

        const rest = new REST({ version: '10' }).setToken(TOKEN!);
        const allCommands = client.commands.map(cmd => cmd.data);

        // ============================================================
        // STRATEGY 1: DEVELOPMENT MODE (GUILD_ID is defined)
        // -> Deploy ALL commands to the Dev Guild (Instant updates)
        // -> Clear ALL Global commands (Fixes the duplicate issue)
        // ============================================================
        if (GUILD_ID) {
            console.log(`[DEPLOY] 🛠️  Dev Mode active. Deploying ${allCommands.length} commands to Guild: ${GUILD_ID}`);

            // 1. Put everything into the Dev Guild
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), 
                { body: allCommands }
            );
            console.log('[DEPLOY] ✅ Guild commands updated.');

            // 2. NUCLEAR OPTION: Wipe Global Commands to prevent duplicates
            // This ensures you don't see one "Guild" version and one "Global" version of the same command
            console.log('[DEPLOY] 🧹 Clearing Global commands to prevent duplicates...');
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
            console.log('[DEPLOY] ✅ Global commands cleared.');
        } 
        
        // ============================================================
        // STRATEGY 2: PRODUCTION MODE (GUILD_ID is NOT defined)
        // -> Sorts commands: Global vs. Guild-Specific (admin tools, etc)
        // -> Deploys them separately
        // ============================================================
        else {
            console.log(`[DEPLOY] 🚀 Production Mode active. Sorting commands...`);

            const globalCommands: any[] = [];
            const guildCommandsMap = new Map<string, any[]>();

            // Sort commands based on 'guildIds' property in your command files
            client.commands.forEach((cmd: any) => {
                const data = cmd.data;
                if (cmd.guildIds && Array.isArray(cmd.guildIds) && cmd.guildIds.length > 0) {
                    cmd.guildIds.forEach((gId: string) => {
                        const list = guildCommandsMap.get(gId) || [];
                        list.push(data);
                        guildCommandsMap.set(gId, list);
                    });
                } else {
                    globalCommands.push(data);
                }
            });

            // 1. Deploy Global Commands
            if (globalCommands.length > 0) {
                console.log(`[DEPLOY] 🌍 Deploying ${globalCommands.length} Global commands...`);
                await rest.put(Routes.applicationCommands(CLIENT_ID), { body: globalCommands });
            } else {
                // Safety: If no global commands exist, ensure we clear the cache
                await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
            }

            // 2. Deploy Guild-Specific Commands
            for (const [gId, cmds] of guildCommandsMap.entries()) {
                console.log(`[DEPLOY] 🏰 Deploying ${cmds.length} commands to Guild ${gId}...`);
                await rest.put(Routes.applicationGuildCommands(CLIENT_ID, gId), { body: cmds });
            }
            
            console.log(`[DEPLOY] ✅ Production deployment complete.`);
        }

    } catch (error) {
        const errorId = errorTracker.trackError(error, 'deployment', {
            additionalContext: {
                commandCount: client.commands.size,
                deploymentType: GUILD_ID ? 'dev-guild' : 'prod-global',
                reason: 'Failed to deploy commands to Discord API'
            }
        });
        console.error(`[DEPLOY] Deployment Error. Error ID: ${errorId}`);
        // We do not throw here to prevent the bot from crashing on startup, 
        // but you can uncomment this if you prefer a hard crash:
        // throw error;
    }
}