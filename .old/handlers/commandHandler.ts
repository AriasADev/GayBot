import { CommandInteraction } from 'discord.js';
import { handleGayCounter } from './interactionHandler';

export async function handleCommand(interaction: CommandInteraction) {
    const { commandName } = interaction;

    switch (commandName) {
        case 'gaycounter':
            await handleGayCounter(interaction);
            break;
        default:
            await interaction.reply({
                content: 'Unknown command!',
                ephemeral: true
            });
            break;
    }
}