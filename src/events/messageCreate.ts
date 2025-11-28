import { 
    ChannelType, 
    Message, 
    PartialMessage, 
    ActionRowBuilder, 
    ButtonBuilder, 
    EmbedBuilder,
    ButtonStyle, 
    TextChannel
} from 'discord.js';
import { IEvent } from '../core/IEvent';
import { CustomClient } from '../types';
import { errorTracker } from '../core/errorTracker';
import { KeywordChecker } from '../utils/keyword-checker'; 
import { ObjectAny } from '../types'; 

// LABEL: EVENT DEFINITION
const event: IEvent<'messageCreate'> = { 
    name: 'messageCreate',
    once: false,
    
    async execute(message: Message, client: CustomClient) {
        
        if (message.author.bot) return;

        if (!message.content) return; 
        if (!client.keywordChecker || !client.reactionQueue) {
             console.warn('KeywordChecker or reactionQueue is not initialized on CustomClient.');
             return; 
        }

        try {
            const matchingEmojis = client.keywordChecker.getMatchingEmojis(message.content);

            if (matchingEmojis.length > 0) {
                console.log(`Keywords matched in message ID ${message.id}. Emojis: ${matchingEmojis.join(', ')}`);
                
                for (const emoji of matchingEmojis) {
                    client.reactionQueue.push({
                        message: message,
                        emoji: emoji
                    });
                }
            }
        } catch (error) {
            const errorId = errorTracker.trackError(error, 'messageCreate', {
                message,
                additionalContext: {
                    reason: 'Error in keyword processing or queue insertion'
                }
            });
            console.error(`Error handling message keywords. Error ID: ${errorId}`);
        }
    },
};

export default event;