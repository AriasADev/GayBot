import { 
    Interaction, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ApplicationCommandOptionType 
} from 'discord.js';
import { IEvent } from '../core/IEvent';
import { CustomClient } from '../types';

const COMMANDS_PER_PAGE = 5;

const event: IEvent<'interactionCreate'> = {
    name: 'interactionCreate',
    once: false,

    async execute(interaction: Interaction, client: CustomClient) {
        if (!interaction.isButton()) return;
        
        const [action, currentPageStr] = interaction.customId.split(':');
        if (!action.startsWith('help_')) return;

        let page = parseInt(currentPageStr);
        if (action === 'help_next') page++;
        if (action === 'help_prev') page--;

        // 1. Re-flatten the list using the logic that captures all command types
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
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`help_next:${page}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= totalPages - 1)
        );

        await interaction.update({ embeds: [embed], components: [row] });
    }
};

export default event;