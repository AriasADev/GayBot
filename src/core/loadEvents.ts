import { Client } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { IEvent, EventCollection } from './IEvent';
import { errorTracker } from './errorTracker';
import { CustomClient } from '../types'; 

export async function loadEvents(client: CustomClient): Promise<void> { 
    try {
        if (!client.hasOwnProperty('events') || typeof (client as any).events === 'undefined') {
            (client as any).events = new Map<string, IEvent>() as EventCollection;
        }

        const eventsCollection = (client as any).events as EventCollection;
        
        const eventsPath = path.join(process.cwd(), 'dist', 'events');
        
        const statusReport: string[] = [];
        let loadedCount = 0;

        if (!fs.existsSync(eventsPath)) {
            console.log('[EVENTS] No events directory found. Creating it...');
            fs.mkdirSync(path.join(process.cwd(), 'src', 'events'), { recursive: true });
            console.log('[EVENTS] Events directory created. No events loaded.');
            return;
        }

        try {
            const eventFiles = fs.readdirSync(eventsPath)
                .filter(file => file.endsWith('.js')); 

            if (eventFiles.length === 0) {
                console.log('[EVENTS] No event files found.');
                return;
            }

            for (const file of eventFiles) {
                const filePath = path.join(eventsPath, file);
                
                try {
                    const eventModule = await import(filePath);
                    const event: IEvent = eventModule.default || eventModule;

                    if ('name' in event && 'execute' in event) {
                        if (event.once) {
                            client.once(event.name, async (...args) => {
                                try {
                                    await event.execute(...args, client); 
                                } catch (error) {
                                    const errorId = errorTracker.trackError(error, 'unknown', {
                                        additionalContext: {
                                            eventName: event.name,
                                            eventFile: file,
                                            reason: 'Error executing event handler (client.once)'
                                        }
                                    });
                                    console.error(`Error executing event ${event.name}. Error ID: ${errorId}`);
                                }
                            });
                        } else {
                            client.on(event.name, async (...args) => {
                                try {
                                    await event.execute(...args, client); 
                                } catch (error) {
                                    const errorId = errorTracker.trackError(error, 'unknown', {
                                        additionalContext: {
                                            eventName: event.name,
                                            eventFile: file,
                                            reason: 'Error executing event handler (client.on)'
                                        }
                                    });
                                    console.error(`Error executing event ${event.name}. Error ID: ${errorId}`);
                                }
                            });
                        }
                        
                        eventsCollection.set(event.name, event);
                        statusReport.push(`[LOADED] ${event.name} (${file})${event.once ? ' [ONCE]' : ''}`);
                        loadedCount++;
                    } else {
                        statusReport.push(`[FAILED] ${file} (Missing 'name' or 'execute')`);
                        console.warn(`[WARNING] The event at ${filePath} is missing a required "name" or "execute" property.`);
                    }
                } catch (error) {
                    const errorId = errorTracker.trackError(error, 'startup', {
                        additionalContext: {
                            filePath,
                            event: file.replace('.js', ''),
                            reason: 'Failed to import event module'
                        }
                    });
                    statusReport.push(`[ERROR] ${file} (Import failed - Error ID: ${errorId})`);
                    console.error(`Error importing event from ${filePath}. Error ID: ${errorId}`);
                }
            }
            
            console.log('--- Event Loading Summary ---');
            console.log(`Successfully loaded ${loadedCount} events.`);
            statusReport.forEach(line => console.log(line));
            console.log('-----------------------------');

        } catch (error) {
            const errorId = errorTracker.trackError(error, 'startup', {
                additionalContext: {
                    eventsPath,
                    reason: 'Error reading events directory'
                }
            });
            console.error(`Error processing events in ${eventsPath}. Error ID: ${errorId}`);
            return;
        }
    } catch (error) {
        const errorId = errorTracker.trackError(error, 'startup', {
            additionalContext: {
                reason: 'Unexpected error in loadEvents function'
            }
        });
        console.error(`Unexpected error in loadEvents. Error ID: ${errorId}`);
        throw error;
    }
}