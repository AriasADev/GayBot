// // src/events/interactionCreate_Clone.ts
// import { ChatInputCommandInteraction, ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
// import { IEvent } from '../core/IEvent';
// import { CustomClient } from '../types';

// const event: IEvent<'interactionCreate'> = {
//     name: 'interactionCreate',
//     once: false,

//     async execute(interaction: any, client: CustomClient) {
//         // Only handle button clicks
//         if (!interaction.isButton()) return;

//         // CustomID format: "clone:targetUserId:currentCount"
//         const [action, targetId, countStr] = interaction.customId.split(':');

//         if (action !== 'clone') return;

//         try {
//             // 1. Parse current data
//             const currentCount = parseInt(countStr);
//             const nextCount = currentCount + 1;
//             const targetUser = await client.users.fetch(targetId).catch(() => null);
            
//             if (!targetUser) {
//                 return interaction.reply({ content: "❌ Target user not found.", ephemeral: true });
//             }

//             // 2. Build the NEW button with the NEW count in the ID
//             const newCustomId = `clone:${targetId}:${nextCount}`;
//             const button = new ButtonBuilder()
//                 .setCustomId(newCustomId)
//                 .setLabel('Clone Again!')
//                 .setStyle(ButtonStyle.Primary)
//                 .setEmoji('👥');

//             const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

//             // [Image of Discord interaction component update flow]
//             // 3. Update the original message
//             await interaction.update({
//                 content: `👥 **${targetUser.username}** has been cloned **${nextCount}** times.\n-# Powered by ${client.user?.username}`,
//                 components: [row]
//             });

//         } catch (error) {
//             console.error('Error handling clone button:', error);
//             await interaction.followUp({ content: "There was an error updating the clone count.", ephemeral: true });
//         }
//     }
// };

// export default event;