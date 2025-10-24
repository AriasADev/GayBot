import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

const commands = [
    new SlashCommandBuilder()
        .setName('gaycounter')
        .setDescription('Find out how gay you are!')
        .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

export async function registerCommands(clientId: string) {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}