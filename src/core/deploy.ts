import { Client, REST, Routes, Collection } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { IApplicationCommand, CommandCollection } from './IApplicationCommand';
import { errorTracker } from './errorTracker';

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ADD DEBUG LOGGING
console.log('[DEBUG] Environment variables:');
console.log('BOT_TOKEN:', TOKEN ? '✓ Set' : '✗ Not set');
console.log('CLIENT_ID:', CLIENT_ID ? '✓ Set' : '✗ Not set');
console.log('GUILD_ID:', GUILD_ID ? '✓ Set (optional)' : '✗ Not set (optional)');

export async function loadCommands(client: Client): Promise<void> {
  try {
    if (!(client as any).commands) {
      (client as any).commands = new Collection<string, IApplicationCommand>() as CommandCollection;
    }
    
    const commandsToDeploy: IApplicationCommand['data'][] = [];
    const commandsCollection = (client as any).commands as CommandCollection;
    
    const commandsPath = path.join(process.cwd(), 'dist', 'commands'); 
    
    const statusReport: string[] = [];
    let loadedCount = 0;

    try {
      const commandFiles = fs.readdirSync(commandsPath)
        .filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        
        try {
          const commandModule = await import(filePath); 
          const command: IApplicationCommand = commandModule.default || commandModule;

          if ('data' in command && 'execute' in command) {
            commandsCollection.set(command.data.name, command);
            commandsToDeploy.push(command.data); 
            statusReport.push(`[LOADED] ${command.data.name} (${file})`);
            loadedCount++;
          } else {
            statusReport.push(`[FAILED] ${file} (Missing 'data' or 'execute')`);
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
          }
        } catch (error) {
          const errorId = errorTracker.trackError(error, 'deployment', {
            command: file.replace('.js', ''),
            additionalContext: {
              filePath,
              reason: 'Failed to import command module'
            }
          });
          statusReport.push(`[ERROR] ${file} (Import failed - Error ID: ${errorId})`);
          console.error(`Error importing command from ${filePath}. Error ID: ${errorId}`);
        }
      }
      
      console.log('--- Command Loading Summary ---');
      console.log(`Successfully loaded ${loadedCount} commands.`);
      statusReport.forEach(line => console.log(line));
      console.log('-------------------------------');

    } catch (error) {
      const errorId = errorTracker.trackError(error, 'deployment', {
        additionalContext: {
          commandsPath,
          reason: 'Error reading commands directory'
        }
      });
      console.error(`Error processing commands in ${commandsPath}. Error ID: ${errorId}`);
      return;
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN!);

    try {
      console.log(`[DEPLOY] Started refreshing ${commandsToDeploy.length} application (/) commands...`);

      const route = GUILD_ID 
        ? Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID) 
        : Routes.applicationCommands(CLIENT_ID!);

      const data: any = await rest.put(route, { body: commandsToDeploy });

      console.log(`[DEPLOY] Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
      const errorId = errorTracker.trackError(error, 'deployment', {
        additionalContext: {
          commandCount: commandsToDeploy.length,
          deploymentType: GUILD_ID ? 'guild' : 'global',
          reason: 'Failed to deploy commands to Discord API'
        }
      });
      console.error(`[DEPLOY] Deployment Error. Error ID: ${errorId}`);
      throw error;
    }
  } catch (error) {
    const errorId = errorTracker.trackError(error, 'deployment', {
      additionalContext: {
        reason: 'Unexpected error in loadCommands function'
      }
    });
    console.error(`Unexpected error in loadCommands. Error ID: ${errorId}`);
    throw error;
  }
}