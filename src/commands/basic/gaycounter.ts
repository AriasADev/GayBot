import { 
    ApplicationCommandOptionType, 
    CommandInteraction, 
    EmbedBuilder, 
    ChatInputCommandInteraction,
    ApplicationCommandType,
    InteractionContextType,
    ApplicationIntegrationType,
    RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js';
import { IApplicationCommand } from '../../core/IApplicationCommand';
import { CustomClient } from '../../types';
import { errorTracker } from '../../core/errorTracker';

// Override map for specific user IDs
const gaynessOverrides = new Map<string, number>([
    // Add your user IDs here:
    ['652597508027187240', 100],
    ['1025770042245251122', 69],
]);

function calculateGayness(userId: string): number {
    // Check for override first
    if (gaynessOverrides.has(userId)) {
        return gaynessOverrides.get(userId)!;
    }
    
    // Otherwise, calculate normally
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Returns a number between 0 and 100
    return Math.abs(hash % 101);
}

const gayCounterCommand: IApplicationCommand = {
    data: {
        type: ApplicationCommandType.ChatInput,
        name: 'gaycounter',
        description: 'Find out how gay a user is!',
        options: [
            {
                type: ApplicationCommandOptionType.User,
                name: 'target',
                description: 'The user to check.',
                required: true
            }
        ],
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
    
    // permissions is set to 'user' or removed if not needed
    permissions: 'user', 

    async execute(interaction: CommandInteraction, client: CustomClient) {
        if (!interaction.isChatInputCommand()) return; 
        
        const chatInteraction = interaction as ChatInputCommandInteraction;
        const targetUser = chatInteraction.options.getUser('target', true);
        
        await chatInteraction.deferReply(); 
        
        const targetId = targetUser.id;
        const executionPromise = new Promise<void>(async (resolve, reject) => {
            try {
                // Core command logic
                const gayness = calculateGayness(targetId);
                let message = '';
                
                if (gayness < 20) {
                    message = `**${targetUser.username}** is **${gayness}% gay**! Keep shining! 🌈`;
                } else if (gayness <= 80) {
                    message = `**${targetUser.username}** is **${gayness}% gay**! That's a good spectrum position! 😉`;
                } else {
                    message = `**${targetUser.username}** is **${gayness}% gay**! Congratulations, that's max gay energy! ✨`;
                }

                const embed = new EmbedBuilder()
                    .setTitle('🏳️‍🌈 Gayness Percentage Calculator')
                    .setDescription(message)
                    .setColor(0x8e44ad); 

                await chatInteraction.editReply({ embeds: [embed] });
                resolve();

            } catch (error) {
                const errorId = errorTracker.trackError(error, 'command'); 
                await chatInteraction.editReply(`An internal error occurred (ID: ${errorId}).`);
                reject(error); // Reject the promise
            } 
        });

        const queueKey = `gaycounter:${targetId}`;
        client.interactionQueue.set(queueKey, executionPromise);
        
        try {
            await executionPromise;
        } finally {
            client.interactionQueue.delete(queueKey);
        }
    },
};

export default gayCounterCommand;
