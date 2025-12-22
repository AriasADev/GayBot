import { 
    ApplicationCommandOptionType, 
    CommandInteraction, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { IApplicationCommand } from '../../core/IApplicationCommand';
import { CustomClient } from '../../types';

const COMMANDS_PER_PAGE = 5;

const helpCommand: IApplicationCommand = {
    data: {
        name: 'help',
        description: 'View all available commands and their details.',
    },
    permissions: 'user',

    async execute(interaction: CommandInteraction, client: CustomClient) {
        if (!interaction.isChatInputCommand()) return;
        const commandList: string[] = [];
        
        client.commands.forEach((cmd) => {
    const data = cmd.data as any;
    const cmdName = data.name;
    const cmdDesc = data.description;
    if (!data.options || data.options.length === 0) {
        commandList.push(`**/${cmdName}**\n└ ${cmdDesc}`);
    } else {
        let hasSubcommands = false;
        data.options.forEach((opt: any) => {
            if (opt.type === ApplicationCommandOptionType.Subcommand) {
                hasSubcommands = true;
                commandList.push(`**/${cmdName} ${opt.name}**\n└ ${opt.description}`);
            } else if (opt.type === ApplicationCommandOptionType.SubcommandGroup) {
                hasSubcommands = true;
                opt.options?.forEach((subOpt: any) => {
                    commandList.push(`**/${cmdName} ${opt.name} ${subOpt.name}**\n└ ${subOpt.description}`);
                });
            }
        });
        if (!hasSubcommands) {
            commandList.push(`**/${cmdName}**\n└ ${cmdDesc}`);
        }
    }
});

        const totalPages = Math.ceil(commandList.length / COMMANDS_PER_PAGE);
        const page = 0;

        const embed = new EmbedBuilder()
            .setTitle('📖 Available Commands')
            .setDescription(commandList.slice(page * COMMANDS_PER_PAGE, (page + 1) * COMMANDS_PER_PAGE).join('\n\n'))
            .setFooter({ text: `Page ${page + 1} of ${totalPages}` })
            .setColor(0x5865F2);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`help_prev:${page}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`help_next:${page}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(totalPages <= 1)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};

export default helpCommand;