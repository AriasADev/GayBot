import { 
    ApplicationCommandOptionType, 
    CommandInteraction, 
    ChatInputCommandInteraction,
    ApplicationCommandType,
    InteractionContextType,
    ApplicationIntegrationType,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    MessageFlags,
    TextChannel,
} from 'discord.js';
import { IApplicationCommand } from '../../core/IApplicationCommand';
import { CustomClient } from '../../types';
import { errorTracker } from '../../core/errorTracker';

const BOT_DEVELOPER_IDS = [
    '652597508027187240', 
    '955530199972347935', 
];

const sayCommand: IApplicationCommand = {
    data: {
        type: ApplicationCommandType.ChatInput,
        name: 'say',
        description: 'Sends a message as the bot (Developer Only), optionally replying to another message.',
        options: [
            {
                name: 'message',
                description: 'The content the bot should say.',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: 'reply_to',
                description: 'The ID of the message to reply to (optional).',
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
        
        

        contexts: [
            InteractionContextType.Guild,
        ],
        integration_types: [
            ApplicationIntegrationType.GuildInstall,
        ]
    } as RESTPostAPIChatInputApplicationCommandsJSONBody,
    
    
    permissions: 'developer', 

    async execute(interaction: CommandInteraction, client: CustomClient) {
        if (!interaction.isChatInputCommand() || !interaction.inGuild()) return; 
        
        const chatInteraction = interaction as ChatInputCommandInteraction;
        const requesterId = interaction.user.id;
        const targetChannel = interaction.channel;

        
        if (!BOT_DEVELOPER_IDS.includes(requesterId)) {
            return chatInteraction.reply({ 
                content: '🚫 This command is strictly restricted to bot developers.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        
        if (!targetChannel || !('send' in targetChannel) || targetChannel.isThread()) {
             return chatInteraction.reply({ 
                content: '❌ Cannot send messages in this channel type (or thread).',
                flags: MessageFlags.Ephemeral
            });
        }
        
        
        await chatInteraction.deferReply({ ephemeral: true }); 
        
        try {
            const messageContent = chatInteraction.options.getString('message', true);
            const replyId = chatInteraction.options.getString('reply_to');
            const textChannel = targetChannel as TextChannel;
            
            let replyOptions: any = {};

            
            if (replyId) {
                try {
                    const messageToReply = await textChannel.messages.fetch(replyId);
                    
                    replyOptions = { messageReference: messageToReply }; 
                } catch (e) {
                    
                    await chatInteraction.editReply(`⚠️ Could not find message with ID \`${replyId}\`. Sending content without reply.`);
                    replyOptions = {};
                }
            }

            
            await textChannel.send({ 
                content: messageContent,
                ...replyOptions,
                
                allowedMentions: { repliedUser: false } 
            });

            
            await chatInteraction.editReply(`✅ Successfully sent message to #${textChannel.name}.`);

        } catch (error) {
            const errorId = errorTracker.trackError(error, 'command'); 
            await chatInteraction.editReply(`An internal error occurred while trying to send the message (ID: ${errorId}).`);
        }
    },
};

export default sayCommand;