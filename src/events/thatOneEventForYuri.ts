// import { 
//     ChannelType, 
//     Message, 
//     PartialMessage, 
//     ActionRowBuilder, 
//     ButtonBuilder, 
//     EmbedBuilder,
//     ButtonStyle, 
//     TextChannel
// } from 'discord.js';
// import { IEvent } from '../core/IEvent';
// import { CustomClient } from '../types';
// import { errorTracker } from '../core/errorTracker';
// import { KeywordChecker } from '../utils/keyword-checker'; 
// import { ObjectAny } from '../types'; 

// // LABEL: EVENT DEFINITION
// const event: IEvent<'messageCreate'> = { 
//     name: 'messageCreate',
//     once: false,
    
//     async execute(message: Message, client: CustomClient) {
        
//         // Ignore messages from bots to prevent loops
//         if (message.author.bot) return;

//         // Ignore messages without content
//         if (!message.content) return; 

//         const contentLower = message.content.toLowerCase();
//         const keyword = 'yuri';

//         // --- NEW KEYWORD DETECTION LOGIC (Now sends a single line message) ---
//         if (contentLower.includes(keyword)) {
//             console.log(`Keyword "${keyword}" detected in message ID ${message.id}. Sending custom response.`);

//             // Check if the channel is a valid text-based channel before trying to send a message
//             if (message.channel.type === ChannelType.GuildText || message.channel.type === ChannelType.PublicThread || message.channel.type === ChannelType.PrivateThread) {
                
//                 // --- CUSTOM SINGLE-LINE MESSAGE ---
//                 const customResponse = `Hey <@704678982955565158> time for yuri (Ari asked me to make this)`;
                
//                 try {
//                     // Send the custom single-line message to the channel
//                     await message.channel.send(customResponse);
//                 } catch (sendError) {
//                     console.error(`Failed to send custom message in channel ${message.channel.id}:`, sendError);
//                 }
//             } else {
//                 console.warn(`Keyword detected but cannot send response in channel type: ${message.channel.type}`);
//             }
//         }
//         // --- END NEW LOGIC ---

//         // Existing keyword/emoji logic
//         if (!client.keywordChecker || !client.reactionQueue) {
//             console.warn('KeywordChecker or reactionQueue is not initialized on CustomClient.');
//             return; 
//         }

//         try {
//             const matchingEmojis = client.keywordChecker.getMatchingEmojis(message.content);

//             if (matchingEmojis.length > 0) {
//                 console.log(`Keywords matched in message ID ${message.id}. Emojis: ${matchingEmojis.join(', ')}`);
                
//                 for (const emoji of matchingEmojis) {
//                     client.reactionQueue.push({
//                         message: message,
//                         emoji: emoji
//                     });
//                 }
//             }
//         } catch (error) {
//             const errorId = errorTracker.trackError(error, 'messageCreate', {
//                 message,
//                 additionalContext: {
//                     reason: 'Error in keyword processing or queue insertion'
//                 }
//             });
//             console.error(`Error handling message keywords. Error ID: ${errorId}`);
//         }
//     },
// };

// export default event;