// src/core/loadCommands.ts

import { Collection, CommandInteraction, ApplicationCommandOptionType } from 'discord.js';
import { CustomClient } from '../types';
import * as fs from 'fs'; 
import * as path from 'path'; 
import { errorTracker } from './errorTracker';
import { IApplicationCommand } from './IApplicationCommand';

// Extended interface to support the hidden handler map
interface IExtendedCommand extends IApplicationCommand {
    _subcommandMap?: Map<string, Function>;
}

/**
 * Recursively scans a directory for .js files
 */
const getAllJsFiles = (dirPath: string): string[] => {
    const jsFiles: string[] = [];
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                jsFiles.push(...getAllJsFiles(fullPath));
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                jsFiles.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`❌ Error reading directory ${dirPath}:`, error);
    }
    return jsFiles;
};

/**
 * Merges subcommands using a Router strategy.
 * It maps subcommand names to the specific execute function from their source file.
 */
const mergeSubcommands = (existing: IExtendedCommand, incoming: IApplicationCommand, filePath: string): boolean => {
    const incomingOptions = incoming.data.options || [];

    // 1. Validation: Ensure we have subcommands to merge
    if (incomingOptions.length === 0) {
        console.warn(`⚠️  ${filePath} has no subcommands to merge.`);
        return false;
    }

    // 2. Initialize the Router Map on the existing command if it's the first merge
    if (!existing._subcommandMap) {
        existing._subcommandMap = new Map();

        // If the 'existing' command had subcommands, map them to its own execute function
        if (existing.data.options) {
            existing.data.options.forEach((opt: any) => {
                // Only map explicit Subcommands (Type 1)
                if (opt.type === ApplicationCommandOptionType.Subcommand) {
                    existing._subcommandMap!.set(opt.name, existing.execute);
                }
            });
        }
    }

    // 3. Merge Incoming Data
    if (!existing.data.options) existing.data.options = [];

    let mergedCount = 0;

    for (const option of incomingOptions) {
        // Prevent overwriting existing subcommands
        if (existing.data.options.some((opt: any) => opt.name === option.name)) {
            console.warn(`⚠️  Subcommand '${option.name}' collision in '${existing.data.name}'. Skipping version from ${filePath}.`);
            continue;
        }

        // Add the option structure
        existing.data.options.push(option);
        
        // Register the handler: This subcommand name -> This file's execute function
        if (option.type === ApplicationCommandOptionType.Subcommand) {
            existing._subcommandMap.set(option.name, incoming.execute);
            mergedCount++;
        }
    }

    // 4. Create (or Update) the Routing Execute Function
    // This replaces the standard execute with one that checks which subcommand was used
    existing.execute = async (interaction: CommandInteraction, client: CustomClient) => {
        try {
            // Identify which subcommand was triggered
            // Note: This requires the interaction to be an option-capable interaction
            if (!interaction.isChatInputCommand()) return;

            const subCommandName = interaction.options.getSubcommand(false);

            if (subCommandName && existing._subcommandMap?.has(subCommandName)) {
                // ✅ ROUTING: Call the specific function for this subcommand
                const handler = existing._subcommandMap.get(subCommandName);
                if (handler) {
                    await handler(interaction, client);
                }
            } else {
                // Fallback: If no subcommand matched (or it's a top-level command), try standard execution
                // This covers cases where logic isn't strictly inside the map
                console.warn(`⚠️  No specific handler found for subcommand '${subCommandName}' on '${existing.data.name}'`);
                await interaction.reply({ content: "❌ Subcommand handler missing.", ephemeral: true });
            }
        } catch (error) {
            // Let the main error tracker handle the crash, but log context
            console.error(`Error in merged command router for ${existing.data.name}:`, error);
            throw error;
        }
    };

    return mergedCount > 0;
};

/**
 * Main Loader Function
 */
export const loadCommands = async (client: CustomClient) => {
    client.commands = new Collection();
    const commandsBasePath = path.join(process.cwd(), 'dist', 'commands'); 
    
    // Stats counters
    const stats = { loaded: 0, merged: 0, skipped: 0, errors: 0 };

    console.log(`📂 Scanning for commands in: ${commandsBasePath}`);

    try {
        const allCommandFiles = getAllJsFiles(commandsBasePath);
        console.log(`📄 Found ${allCommandFiles.length} command file(s)...`);

        for (const filePath of allCommandFiles) {
            const relativePath = path.relative(commandsBasePath, filePath);
            
            try {
                // Clear require cache for hot-reloading support (optional but good for dev)
                delete require.cache[require.resolve(filePath)];

                const commandModule = require(filePath);
                const command: IApplicationCommand = commandModule.default || commandModule;

                // Validate Command Structure
                if (!command || !command.data || !command.data.name) {
                    console.warn(`⚠️  Skipping ${relativePath}: Missing 'data.name' property.`);
                    stats.skipped++;
                    continue;
                }

                const existingCommand = client.commands.get(command.data.name) as IExtendedCommand;

                if (existingCommand) {
                    // --- MERGE STRATEGY ---
                    const merged = mergeSubcommands(existingCommand, command, relativePath);
                    if (merged) {
                        console.log(`🔗 Merged subcommands from ${relativePath} -> /${command.data.name}`);
                        stats.merged++;
                    } else {
                        stats.skipped++;
                    }
                } else {
                    // --- NEW COMMAND ---
                    client.commands.set(command.data.name, command);
                    stats.loaded++;
                    console.log(`✅ Loaded /${command.data.name} (${relativePath})`);
                }

            } catch (error) {
                const errorId = errorTracker.trackError(error, 'deployment'); // Ensure 'deployment' is in your ErrorContext type
                console.error(`❌ Failed to load ${relativePath} (ID: ${errorId})`);
                stats.errors++;
            }
        }

        console.log(`\n🎉 Command Loading Summary:`);
        console.log(`   ✅ Unique Commands: ${stats.loaded}`);
        console.log(`   🔗 Merged Files:    ${stats.merged}`);
        console.log(`   ⚠️ Skipped:         ${stats.skipped}`);
        console.log(`   ❌ Errors:          ${stats.errors}`);
        console.log(`   📊 Total Map Size:  ${client.commands.size}`);

    } catch (error) {
        errorTracker.trackError(error, 'startup');
        console.error(`❌ Critical error during command loading:`, error);
    }
};