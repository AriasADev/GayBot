import { CommandInteraction } from 'discord.js';

export async function handleGayCounter(interaction: CommandInteraction) {
    // Generate a random number between 1 and 100
    const gayLevel = Math.floor(Math.random() * 100) + 1;
    
    await interaction.reply({
        content: `Here's how gay you are: **${gayLevel}**% 🏳️‍🌈`,
    });
}