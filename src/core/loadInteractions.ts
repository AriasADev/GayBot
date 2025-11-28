import { Client, Collection } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { IInteraction, InteractionCollection } from './IInteraction';
import { errorTracker } from './errorTracker';

export async function loadInteractions(client: Client): Promise<void> {
  try {
    if (!(client as any).interactions) {
      (client as any).interactions = new Collection<string, IInteraction>() as InteractionCollection;
    }
    
    const interactionsCollection = (client as any).interactions as InteractionCollection;
    
    const interactionsPath = path.join(process.cwd(), 'dist', 'interactions');
    
    const statusReport: string[] = [];
    let loadedCount = 0;

    if (!fs.existsSync(interactionsPath)) {
      console.log('[INTERACTIONS] No interactions directory found. Creating it...');
      fs.mkdirSync(interactionsPath, { recursive: true });
      console.log('[INTERACTIONS] Interactions directory created. No interactions loaded.');
      return;
    }

    try {
      const interactionFiles = fs.readdirSync(interactionsPath)
        .filter(file => file.endsWith('.js'));

      if (interactionFiles.length === 0) {
        console.log('[INTERACTIONS] No interaction files found.');
        return;
      }

      for (const file of interactionFiles) {
        const filePath = path.join(interactionsPath, file);
        
        try {
          const interactionModule = await import(filePath);
          const interaction: IInteraction = interactionModule.default || interactionModule;

          if ('customId' in interaction && 'execute' in interaction) {
            const key = typeof interaction.customId === 'string' 
              ? interaction.customId 
              : `pattern_${loadedCount}`;
            
            interactionsCollection.set(key, interaction);
            statusReport.push(`[LOADED] ${key} (${file})`);
            loadedCount++;
          } else {
            statusReport.push(`[FAILED] ${file} (Missing 'customId' or 'execute')`);
            console.warn(`[WARNING] The interaction at ${filePath} is missing a required "customId" or "execute" property.`);
          }
        } catch (error) {
          const errorId = errorTracker.trackError(error, 'startup', {
            additionalContext: {
              filePath,
              interaction: file.replace('.js', ''),
              reason: 'Failed to import interaction module'
            }
          });
          statusReport.push(`[ERROR] ${file} (Import failed - Error ID: ${errorId})`);
          console.error(`Error importing interaction from ${filePath}. Error ID: ${errorId}`);
        }
      }
      
      console.log('--- Interaction Loading Summary ---');
      console.log(`Successfully loaded ${loadedCount} interactions.`);
      statusReport.forEach(line => console.log(line));
      console.log('-----------------------------------');

    } catch (error) {
      const errorId = errorTracker.trackError(error, 'startup', {
        additionalContext: {
          interactionsPath,
          reason: 'Error reading interactions directory'
        }
      });
      console.error(`Error processing interactions in ${interactionsPath}. Error ID: ${errorId}`);
      return;
    }
  } catch (error) {
    const errorId = errorTracker.trackError(error, 'startup', {
      additionalContext: {
        reason: 'Unexpected error in loadInteractions function'
      }
    });
    console.error(`Unexpected error in loadInteractions. Error ID: ${errorId}`);
    throw error;
  }
}