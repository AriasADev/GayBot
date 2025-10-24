import { Client, REST, Routes, Collection } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { IApplicationCommand, CommandCollection } from './IApplicationCommand';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

export async function loadCommands(client: Client): Promise<void> {
  if (!(client as any).commands) {
    (client as any).commands = new Collection<string, IApplicationCommand>() as CommandCollection;
  }
  
  const commandsToDeploy: IApplicationCommand['data'][] = [];
  const commandsCollection = (client as any).commands as CommandCollection;
  
  const commandsPath = path.join(process.cwd(), 'src', 'commands'); 
  
  const statusReport: string[] = [];
  let loadedCount = 0;

  try {
    const commandFiles = fs.readdirSync(commandsPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      
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
    }
    
    console.log('--- Command Loading Summary ---');
    console.log(`Successfully loaded ${loadedCount} commands.`);
    statusReport.forEach(line => console.log(line));
    console.log('-------------------------------');

  } catch (error) {
    console.error(`Error processing commands in ${commandsPath}:`, error);
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
    console.error('[DEPLOY] Deployment Error:', error);
  }
}