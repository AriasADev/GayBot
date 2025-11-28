// src/utils/reactionQueueProcessor.ts

import { CustomClient, QueueEntry } from '../types';
import { errorTracker } from '../core/errorTracker';

// Flag to prevent multiple concurrent processing loops
let isProcessingQueue = false;

/**
 * Processes the reaction queue one entry at a time to prevent Discord API rate limits.
 * This function should be called repeatedly via an interval (e.g., every 1 second) in index.ts.
 * @param client The CustomClient instance.
 */
export async function processReactionQueue(client: CustomClient) {
    // 1. Check if a loop is already running or the queue is empty
    if (isProcessingQueue || client.reactionQueue.length === 0) {
        return;
    }

    isProcessingQueue = true;
    
    // 2. Safely take the first entry from the queue
    const entry: QueueEntry | undefined = client.reactionQueue.shift();
    
    if (entry) {
        try {
            // Fetch the message again to ensure we have the most current Message object 
            // before reacting, as the message in the queue might be partial or stale.
            // NOTE: Using .fetch() might be overkill for messageCreate events but is safer.
            const message = await entry.message.fetch();
            
            console.log(`Reacting with ${entry.emoji} to message ID ${message.id}`);
            
            // 3. Execute the reaction API call
            await message.react(entry.emoji);
            
        } catch (error) {
            // 4. Log and track any errors (e.g., if the bot doesn't have permission to react)
            const errorId = errorTracker.trackError(error, 'reaction', {
                message: entry.message,
                additionalContext: {
                    emoji: entry.emoji,
                    reason: 'Failed to add reaction from queue'
                }
            });
            console.error(`Error reacting with ${entry.emoji}. Error ID: ${errorId}`);
        }
    }

    isProcessingQueue = false;
    
    // 5. If there are still items left in the queue, call this function again 
    // immediately using setTimeout, otherwise, wait for the next setInterval call.
    // This provides a smooth, fast burst execution after the initial interval.
    if (client.reactionQueue.length > 0) {
        setTimeout(() => processReactionQueue(client), 500);
    }
}