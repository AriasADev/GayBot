import { 
    ChatInputCommandInteraction,
    ApplicationCommandType,
    InteractionContextType,
    ApplicationIntegrationType,
    RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js';
import { IApplicationCommand } from '../core/IApplicationCommand';

function calculateGayness(): number {
    return Math.floor(Math.random() * 101);
}

const gayCounterCommand: IApplicationCommand = {
  data: {
    type: ApplicationCommandType.ChatInput,
    name: 'gaycounter',
    description: 'Find out how gay you are!',
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

  async execute(interaction) {
    const chatInteraction = interaction as ChatInputCommandInteraction;
    
    await chatInteraction.deferReply(); 
    
    const gayness = calculateGayness();
    
    let message = '';
    
    if (gayness < 20) {
        message = `You are **${gayness}% gay**! Keep shining! 🌈`;
    } else if (gayness <= 80) {
        message = `You are **${gayness}% gay**! That's a good spectrum position! 😉`;
    } else {
        message = `You are **${gayness}% gay**! Congratulations, that's max gay energy! ✨`;
    }

    await chatInteraction.editReply({ 
      content: message
    });
  },
};

export default gayCounterCommand;