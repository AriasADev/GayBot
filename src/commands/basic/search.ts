import { 
    ApplicationCommandOptionType, 
    CommandInteraction, 
    EmbedBuilder, 
    ChatInputCommandInteraction,
    ApplicationCommandType,
    InteractionContextType,
    ApplicationIntegrationType,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    User,
    GuildMember 
} from 'discord.js';
import { IApplicationCommand } from '../../core/IApplicationCommand';
import { CustomClient } from '../../types';
import { errorTracker } from '../../core/errorTracker';
import fetch from 'node-fetch';

// --- Utility Interfaces from the original code ---

interface ApiTermVersion {
    locale: string;
    term: string;
    definition: string;
    category: string;
}

interface ApiTerm {
    term: string;
    definition: string;
    category: string;
    locale: string;
    versions: ApiTermVersion[];
}

// --- Utility Function from the original code ---

async function searchLgbtqTerm(term: string): Promise<ApiTerm | null> {
    const apiURL = `https://en.pronouns.page/api/terms/search/${encodeURIComponent(term)}`;

    try {
        const response = await fetch(apiURL);
        
        if (!response.ok) {
            return null;
        }

        const data: ApiTerm[] = await response.json() as ApiTerm[];

        if (!Array.isArray(data) || data.length === 0) {
            return null;
        }

        for (const entry of data) {
            if (entry.locale === 'en') {
                return entry;
            }
            const englishVersion = entry.versions.find(v => v.locale === 'en');
            if (englishVersion) {
                return {
                    ...entry,
                    term: englishVersion.term,
                    definition: englishVersion.definition,
                    category: englishVersion.category,
                } as ApiTerm;
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

// --- Command Definition (Adapted to Family Command Structure) ---

const lgbtqSearchCommand: IApplicationCommand = {
    data: {
        type: ApplicationCommandType.ChatInput,
        name: 'lgbtqsearch',
        description: 'Search for definitions of LGBTQIA+ terms',
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: 'term',
                description: 'The term or sexuality to look up (e.g., agender, bi, nonbinary).',
                required: true
            },
            {
                type: ApplicationCommandOptionType.User,
                name: 'member',
                description: 'Optional: A member to ping with the result.',
                required: false
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
    
    permissions: 'user', 

    async execute(interaction: CommandInteraction, client: CustomClient) {
        if (!interaction.isChatInputCommand()) return; 
        
        const chatInteraction = interaction as ChatInputCommandInteraction;
        
        const searchTerm = chatInteraction.options.getString('term', true);
        const targetMember = chatInteraction.options.getMember('member') as GuildMember | null;
        
        await chatInteraction.deferReply(); 
        
        const requesterId = interaction.user.id;
        const queueKey = `lgbtq_search:${requesterId}:${searchTerm.toLowerCase()}`;

        if (client.interactionQueue.has(queueKey)) {
             return chatInteraction.editReply('A search for this term is already running.');
        }

        const executionPromise = new Promise<void>(async (resolve, reject) => {
            let content: string = '';

            try {
                const termData = await searchLgbtqTerm(searchTerm);
                
                let replyEmbed: EmbedBuilder;

                
                if (termData) {
                    const definition = termData.definition
                        .replace(/\{#([^{}]+)=([^{}]+)\}/g, '$2')
                        .replace(/\{([^{}]+)\}/g, '$1');

                    const fullTermDisplay = termData.term.replace(/\|/g, ', ');

                    replyEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle(`🏳️‍🌈 Term: **${fullTermDisplay}**`)
                        .setDescription(definition)
                        .addFields(
                            { name: 'Category', value: termData.category.split(',').map(c => c.trim()).join(', '), inline: true },
                            { name: 'Source', value: 'en.pronouns.page', inline: true }
                        )
                        .setFooter({ text: `Searched term: ${searchTerm}` });
                        
                    if (targetMember) {
                        content = `Hey ${targetMember}! Here is the information you requested about **${searchTerm}**.`;
                    }

                } else {
                    replyEmbed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle('Term Not Found 🔎')
                        .setDescription(`Could not find a definition for **"${searchTerm}"** in the English database. Please try a different spelling or a more general term.`)
                        .setFooter({ text: `API Source: en.pronouns.page` });

                    if (targetMember) {
                        content = `${targetMember}, I couldn't find a definition for **${searchTerm}**.`;
                    }
                }
                
                await chatInteraction.editReply({ 
                    content: content, 
                    embeds: [replyEmbed] 
                });
                resolve();

            } catch (error) {
                const errorId = errorTracker.trackError(error, 'command'); 
                await chatInteraction.editReply(`An internal error occurred during the search (ID: ${errorId}).`);
                reject(error); 
            } finally {
                client.interactionQueue.delete(queueKey);
            }
        });

        client.interactionQueue.set(queueKey, executionPromise);
    },
};

export default lgbtqSearchCommand;