import { 
    ApplicationCommandOptionType, 
    CommandInteraction, 
    EmbedBuilder, 
    ChatInputCommandInteraction,
    ApplicationCommandType,
    InteractionContextType,
    ApplicationIntegrationType,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    MessageFlags
} from 'discord.js';
import { IApplicationCommand } from '../../core/IApplicationCommand';
import { CustomClient } from '../../types';
import { errorTracker } from '../../core/errorTracker';


const pingCommand: IApplicationCommand = {
    data: {
        type: ApplicationCommandType.ChatInput,
        name: 'ping',
        description: 'Replies with Pong and displays latencies.',
        options: [],
        
        contexts: [
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        ],
        integration_types: [
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        ]
    } as RESTPostAPIChatInputApplicationCommandsJSONBody,
    
    permissions: 'user', 

    async execute(interaction: CommandInteraction, client: CustomClient) {
        if (!interaction.isChatInputCommand()) return; 
        
        const chatInteraction = interaction as ChatInputCommandInteraction;
        
        await chatInteraction.deferReply({ flags: MessageFlags.Ephemeral }); 
        
        const requesterId = interaction.user.id;
        const queueKey = `ping:${requesterId}`;

        const executionPromise = new Promise<void>(async (resolve, reject) => {
            try {
                const sent = await chatInteraction.editReply({ content: 'Pinging...' });
                
                const latency = sent.createdTimestamp - chatInteraction.createdTimestamp;
                
                const apiLatency = client.ws.ping;

                const contentMessage = `Pong! 🏓\n**Command Latency**: **${latency}ms**\n**API Latency**: **${apiLatency}ms**`;

                const embed = new EmbedBuilder()
                    .setTitle('🌐 Latency Check Complete')
                    .setDescription(contentMessage)
                    .setColor(0x2ecc71); 

                await chatInteraction.editReply({ 
                    content: '', 
                    embeds: [embed] 
                });
                resolve();

            } catch (error) {
                const errorId = errorTracker.trackError(error, 'command'); 
                await chatInteraction.editReply(`An internal error occurred (ID: ${errorId}).`);
                reject(error); 
            } 
        });

        if (client.interactionQueue.has(queueKey)) {
             return interaction.editReply('A ping command is already running.');
        }

        client.interactionQueue.set(queueKey, executionPromise);
        
        try {
            await executionPromise;
        } finally {
            client.interactionQueue.delete(queueKey);
        }
    },
};

export default pingCommand;