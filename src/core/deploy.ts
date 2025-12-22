import { REST, Routes } from 'discord.js';
import { errorTracker } from './errorTracker';
import { CustomClient } from '../types';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const TOKEN = process.env.BOT_TOKEN; 
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // If set, we are in "Dev Mode"

const COMMAND_IDS_FILE = path.join(process.cwd(), '.logs', 'command-ids.json');

interface CommandIdData {
    lastDeployment: string;
    commands: {
        [commandName: string]: {
            id: string; // Discord command ID (snowflake)
            hash: string; // Hash to detect structure changes
            deployedAt: string;
            guildId?: string; // For guild-specific commands
        };
    };
}

console.log('[DEBUG] Environment variables:');
console.log('BOT_TOKEN:', TOKEN ? '✓ Set' : '✗ Not set');
console.log('CLIENT_ID:', CLIENT_ID ? '✓ Set' : '✗ Not set');
console.log('GUILD_ID:', GUILD_ID ? `✓ Set (Dev Mode: ${GUILD_ID})` : '✗ Not set (Production Mode)');

/**
 * Generates a hash for a command to detect structure changes
 */
function hashCommand(commandData: any): string {
    const normalized = JSON.stringify(commandData, Object.keys(commandData).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Loads the previous command ID data
 */
function loadCommandIds(): CommandIdData {
    try {
        if (fs.existsSync(COMMAND_IDS_FILE)) {
            const data = fs.readFileSync(COMMAND_IDS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.warn('[DEPLOY] Could not load command IDs, will deploy all commands.');
    }
    
    return {
        lastDeployment: new Date().toISOString(),
        commands: {}
    };
}

/**
 * Saves the current command ID data
 */
function saveCommandIds(data: CommandIdData): void {
    try {
        const logsDir = path.dirname(COMMAND_IDS_FILE);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        fs.writeFileSync(COMMAND_IDS_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log('[DEPLOY] ✅ Command IDs saved to', COMMAND_IDS_FILE);
    } catch (error) {
        console.error('[DEPLOY] ⚠️  Failed to save command IDs:', error);
    }
}

/**
 * Fetches existing commands from Discord to get their IDs
 */
async function fetchExistingCommands(
    rest: REST,
    guildId?: string
): Promise<Map<string, { id: string; data: any }>> {
    try {
        const route = guildId 
            ? Routes.applicationGuildCommands(CLIENT_ID!, guildId)
            : Routes.applicationCommands(CLIENT_ID!);
        
        const existingCommands = await rest.get(route) as any[];
        
        const commandMap = new Map<string, { id: string; data: any }>();
        for (const cmd of existingCommands) {
            commandMap.set(cmd.name, { id: cmd.id, data: cmd });
        }
        
        return commandMap;
    } catch (error) {
        console.warn('[DEPLOY] Could not fetch existing commands:', error);
        return new Map();
    }
}

/**
 * Determines which commands need to be deployed based on hash changes
 */
function getCommandsToDeploy(
    allCommands: any[],
    previousIds: CommandIdData,
    guildId?: string
): { deploy: any[], unchanged: string[], updated: Map<string, string> } {
    const deploy: any[] = [];
    const unchanged: string[] = [];
    const updated = new Map<string, string>(); // commandName -> previous ID
    
    for (const cmd of allCommands) {
        const commandName = cmd.name;
        const currentHash = hashCommand(cmd);
        const key = guildId ? `${commandName}:${guildId}` : commandName;
        
        const previousData = previousIds.commands[key];
        
        if (!previousData) {
            // New command
            deploy.push(cmd);
            console.log(`[DEPLOY] 🆕 ${commandName} is new - will deploy`);
        } else if (previousData.hash !== currentHash) {
            // Structure changed
            deploy.push(cmd);
            updated.set(commandName, previousData.id);
            console.log(`[DEPLOY] 🔄 ${commandName} structure changed - will redeploy (old ID: ${previousData.id})`);
        } else {
            // Unchanged
            unchanged.push(commandName);
        }
    }
    
    return { deploy, unchanged, updated };
}

/**
 * Updates the ID data with newly deployed commands
 */
function updateCommandIds(
    idData: CommandIdData,
    deployedCommands: Map<string, { id: string; data: any }>,
    guildId?: string
): CommandIdData {
    const timestamp = new Date().toISOString();
    
    for (const [commandName, info] of deployedCommands) {
        const key = guildId ? `${commandName}:${guildId}` : commandName;
        
        idData.commands[key] = {
            id: info.id,
            hash: hashCommand(info.data),
            deployedAt: timestamp,
            ...(guildId && { guildId })
        };
    }
    
    idData.lastDeployment = timestamp;
    return idData;
}

/**
 * Pretty prints command IDs for easy reference
 */
function printCommandIds(idData: CommandIdData, scope: string): void {
    console.log(`\n[DEPLOY] 📋 ${scope} Command IDs (for mentions):`);
    
    const entries = Object.entries(idData.commands)
        .filter(([key]) => scope === 'Global' ? !key.includes(':') : key.includes(':'));
    
    if (entries.length === 0) {
        console.log('[DEPLOY]    (none)');
        return;
    }
    
    for (const [key, data] of entries) {
        const cmdName = key.split(':')[0];
        console.log(`[DEPLOY]    </${cmdName}:${data.id}>`);
    }
}

export async function deployCommands(client: CustomClient): Promise<void> { 
    try {
        if (!CLIENT_ID || !TOKEN) {
             console.error('[DEPLOY] CLIENT_ID or DISCORD_TOKEN is missing. Aborting deployment.');
             return;
        }

        const rest = new REST({ version: '10' }).setToken(TOKEN!);
        const allCommands = client.commands.map(cmd => cmd.data);
        
        // Load previous command IDs
        const previousIds = loadCommandIds();
        let currentIds = { ...previousIds };

        console.log('[DEPLOY] 📊 Command Deployment Analysis:');
        console.log(`[DEPLOY]    Total commands loaded: ${allCommands.length}`);

        // ============================================================
        // STRATEGY 1: DEVELOPMENT MODE (GUILD_ID is defined)
        // ============================================================
        if (GUILD_ID) {
            console.log(`[DEPLOY] 🛠️  Dev Mode active. Analyzing commands for Guild: ${GUILD_ID}`);

            const { deploy: commandsToDeploy, unchanged, updated } = getCommandsToDeploy(
                allCommands,
                previousIds,
                GUILD_ID
            );

            if (unchanged.length > 0) {
                console.log(`[DEPLOY] ✅ ${unchanged.length} commands unchanged: ${unchanged.join(', ')}`);
            }

            if (commandsToDeploy.length > 0) {
                console.log(`[DEPLOY] 🚀 Deploying ${commandsToDeploy.length} changed/new commands to Guild: ${GUILD_ID}`);
                
                // Deploy commands
                await rest.put(
                    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), 
                    { body: commandsToDeploy }
                );
                
                // Fetch the deployed commands to get their IDs
                const deployedCommands = await fetchExistingCommands(rest, GUILD_ID);
                
                // Update ID cache
                currentIds = updateCommandIds(currentIds, deployedCommands, GUILD_ID);
                
                console.log('[DEPLOY] ✅ Guild commands updated.');
            } else {
                console.log('[DEPLOY] ⏭️  No command changes detected - skipping deployment');
            }

            // Clear Global commands to prevent duplicates
            console.log('[DEPLOY] 🧹 Clearing Global commands to prevent duplicates...');
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
            console.log('[DEPLOY] ✅ Global commands cleared.');
            
            // Print command IDs
            printCommandIds(currentIds, 'Guild');
        } 
        
        // ============================================================
        // STRATEGY 2: PRODUCTION MODE (GUILD_ID is NOT defined)
        // ============================================================
        else {
            console.log(`[DEPLOY] 🚀 Production Mode active. Sorting commands...`);

            const globalCommands: any[] = [];
            const guildCommandsMap = new Map<string, any[]>();

            // Sort commands based on 'guildIds' property
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
                const { deploy: globalToDeploy, unchanged: globalUnchanged } = getCommandsToDeploy(
                    globalCommands,
                    previousIds
                );

                if (globalUnchanged.length > 0) {
                    console.log(`[DEPLOY] ✅ ${globalUnchanged.length} global commands unchanged`);
                }

                if (globalToDeploy.length > 0) {
                    console.log(`[DEPLOY] 🌍 Deploying ${globalToDeploy.length} changed global commands...`);
                    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: globalToDeploy });
                    
                    // Fetch IDs
                    const deployedCommands = await fetchExistingCommands(rest);
                    currentIds = updateCommandIds(currentIds, deployedCommands);
                } else {
                    console.log('[DEPLOY] ⏭️  No global command changes detected');
                }
            } else {
                await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
            }

            // 2. Deploy Guild-Specific Commands
            for (const [gId, cmds] of guildCommandsMap.entries()) {
                const { deploy: guildToDeploy, unchanged: guildUnchanged } = getCommandsToDeploy(
                    cmds,
                    previousIds,
                    gId
                );

                if (guildUnchanged.length > 0) {
                    console.log(`[DEPLOY] ✅ Guild ${gId}: ${guildUnchanged.length} commands unchanged`);
                }

                if (guildToDeploy.length > 0) {
                    console.log(`[DEPLOY] 🏰 Deploying ${guildToDeploy.length} changed commands to Guild ${gId}...`);
                    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, gId), { body: guildToDeploy });
                    
                    // Fetch IDs
                    const deployedCommands = await fetchExistingCommands(rest, gId);
                    currentIds = updateCommandIds(currentIds, deployedCommands, gId);
                } else {
                    console.log(`[DEPLOY] ⏭️  Guild ${gId}: No command changes detected`);
                }
            }
            
            console.log(`[DEPLOY] ✅ Production deployment complete.`);
            
            // Print command IDs
            printCommandIds(currentIds, 'Global');
            for (const gId of guildCommandsMap.keys()) {
                printCommandIds(currentIds, `Guild ${gId}`);
            }
        }

        // Save updated IDs
        saveCommandIds(currentIds);

    } catch (error) {
        const errorId = errorTracker.trackError(error, 'deployment', {
            additionalContext: {
                commandCount: client.commands.size,
                deploymentType: GUILD_ID ? 'dev-guild' : 'prod-global',
                reason: 'Failed to deploy commands to Discord API'
            }
        });
        console.error(`[DEPLOY] Deployment Error. Error ID: ${errorId}`);
    }
}