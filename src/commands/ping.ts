import { 
    ChatInputCommandInteraction,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    InteractionContextType,
    ApplicationIntegrationType,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    MessageFlags
} from 'discord.js';
import { IApplicationCommand } from '../core/IApplicationCommand';

const pingCommand: IApplicationCommand = {
  data: {
    type: ApplicationCommandType.ChatInput,
    name: 'ping',
    description: 'Replies with Pong!',
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
    
    await chatInteraction.deferReply({ flags: MessageFlags.Ephemeral }); 
    
    const sent = await chatInteraction.editReply({ content: 'Pinging...' });
    const latency = sent.createdTimestamp - chatInteraction.createdTimestamp;

    await chatInteraction.editReply({ 
      content: `Pong! 🏓\nLatency: **${latency}ms**\nAPI Latency: **${chatInteraction.client.ws.ping}ms**` 
    });
  },
};

export default pingCommand;