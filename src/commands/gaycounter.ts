import { 
    ChatInputCommandInteraction,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    InteractionContextType,
    ApplicationIntegrationType,
    RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js';
import { IApplicationCommand } from '../core/IApplicationCommand';

function calculateGayness(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 101);
}

const gayCounterCommand: IApplicationCommand = {
  data: {
    type: ApplicationCommandType.ChatInput,
    name: 'gaycounter',
    description: 'Find out how gay you are!',
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

  async execute(interaction) {
    const chatInteraction = interaction as ChatInputCommandInteraction;
    
    const targetUser = chatInteraction.options.getUser('target', true);
    
    await chatInteraction.deferReply(); 
    
    const gayness = calculateGayness(targetUser.id);
    
    let message = '';
    
    if (gayness < 20) {
        message = `**${targetUser.username}** is **${gayness}% gay**! Keep shining! 🌈`;
    } else if (gayness <= 80) {
        message = `**${targetUser.username}** is **${gayness}% gay**! That's a good spectrum position! 😉`;
    } else {
        message = `**${targetUser.username}** is **${gayness}% gay**! Congratulations, that's max gay energy! ✨`;
    }

    await chatInteraction.editReply({ 
      content: message
    });
  },
};

export default gayCounterCommand;
