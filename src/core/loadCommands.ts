// src/core/loadCommands.ts (SUBCOMMAND MERGING SUPPORT)

import { Collection } from 'discord.js';
import { CustomClient } from '../types';
import * as fs from 'fs'; 
import * as path from 'path'; 
import { errorTracker } from './errorTracker';
import { IApplicationCommand } from './IApplicationCommand';

/**
 * Recursively scans a directory for .js files
 * @param dirPath The directory to scan
 * @returns Array of absolute file paths to all .js files
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
 * Merges subcommands from multiple command files into a single command
 */
const mergeSubcommands = (existing: IApplicationCommand, incoming: IApplicationCommand, filePath: string): boolean => {
    // Check if incoming command has subcommands or subcommand groups
    const incomingOptions = incoming.data.options || [];
    
    if (incomingOptions.length === 0) {
        console.warn(`⚠️  ${filePath} has no subcommands to merge`);
        return false;
    }
    
    // Initialize options array if it doesn't exist
    if (!existing.data.options) {
        existing.data.options = [];
    }
    
    let mergedCount = 0;
    
    // Merge each subcommand/subcommand group
    for (const option of incomingOptions) {
        // Check for duplicate subcommands
        const existingOption = existing.data.options.find(
            (opt: any) => opt.name === option.name
        );
        
        if (existingOption) {
            console.warn(`⚠️  Subcommand '${option.name}' already exists in '${existing.data.name}' - skipping from ${filePath}`);
            continue;
        }
        
        existing.data.options.push(option);
        mergedCount++;
    }
    
    // Merge execute handlers if they exist
    if (incoming.execute && typeof incoming.execute === 'function') {
        const originalExecute = existing.execute;
        
        // Create a wrapper that tries both execute functions
        // FIX: Added 'client: any' argument to the execute wrapper function
        existing.execute = async (interaction: any, client: any) => {
            try {
                // Try the original execute first
                if (originalExecute) {
                    // FIX: Pass 'client' to the originalExecute call
                    await originalExecute(interaction, client);
                }
            } catch (error) {
                // If original doesn't handle it, try the incoming one
                if (incoming.execute) {
                    // FIX: Pass 'client' to the incoming.execute call
                    await incoming.execute(interaction, client);
                } else {
                    throw error;
                }
            }
        };
    }
    
    return mergedCount > 0;
};

/**
 * Dynamically loads all application commands from the compiled 'dist/commands' directory.
 * Supports nested subfolders and merges subcommands from multiple files!
 * @param client The bot client instance.
 */
export const loadCommands = async (client: CustomClient) => {
    client.commands = new Collection();
    
    const commandsBasePath = path.join(process.cwd(), 'dist', 'commands'); 
    let loadedCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log(`[SCAN] Scanning for commands in: ${commandsBasePath}`);

    try {
        const allCommandFiles = getAllJsFiles(commandsBasePath);
        
        console.log(`[LOAD] ${allCommandFiles.length} command file(s) to process...`);

        for (const filePath of allCommandFiles) {
            const relativePath = path.relative(commandsBasePath, filePath);
            
            try {
                const commandModule = require(filePath); 
                const command: IApplicationCommand = commandModule.default || commandModule; 

                if (command && command.data && command.data.name) { 
                    const existingCommand = client.commands.get(command.data.name);
                    
                    if (existingCommand) {
                        // Try to merge subcommands
                        const merged = mergeSubcommands(existingCommand, command, relativePath);
                        
                        if (merged) {
                            console.log(`🔗 Merged subcommands from ${relativePath} into '${command.data.name}'`);
                            mergedCount++;
                        } else {
                            console.warn(`⚠️  Duplicate command '${command.data.name}' in ${relativePath} - skipping`);
                            skippedCount++;
                        }
                        continue;
                    }

                    client.commands.set(command.data.name, command);
                    loadedCount++;
                    console.log(`[LOADED] ${command.data.name} (${relativePath})`);
                } else {
                    console.warn(`[WARN]  Invalid command structure in ${relativePath} - missing 'data' or 'data.name'`);
                    skippedCount++;
                }
            } catch (error) {
                const errorId = errorTracker.trackError(error, 'deployment');
                console.error(`❌ Failed to load ${relativePath} (Error ID: ${errorId})`);
                console.error(`   Reason:`, error instanceof Error ? error.message : error);
                errorCount++;
            }
        }

        console.log(`\n🎉 Command Loading Summary:`);
        console.log(`   ✅ Loaded: ${loadedCount}`);
        console.log(`   🔗 Merged: ${mergedCount}`);
        console.log(`   ⚠️  Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📊 Total in collection: ${client.commands.size}`);
        
    } catch (error) {
        const errorId = errorTracker.trackError(error, 'startup');
        console.error(`❌ Critical error loading commands (ID: ${errorId})`);
        console.error(`   Check that files are compiled to: ${commandsBasePath}`);
    }
};