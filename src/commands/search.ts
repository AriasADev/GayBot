import { 
    ChatInputCommandInteraction,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    InteractionContextType,
    ApplicationIntegrationType,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    EmbedBuilder,
    User 
} from 'discord.js';
import { IApplicationCommand } from '../core/IApplicationCommand';
import fetch from 'node-fetch';

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

async function searchLgbtqTerm(term: string): Promise<ApiTerm | null> {
    const apiURL = `https://en.pronouns.page/api/terms/search/${encodeURIComponent(term)}`;

    try {
        const response = await fetch(apiURL);
        
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
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
                    locale: englishVersion.locale,
                } as ApiTerm;
            }
        }

        return null;
    } catch (error) {
        console.error('Error fetching data from API:', error);
        return null;
    }
}


const lgbtqSearchCommand: IApplicationCommand = {
    data: {
        type: ApplicationCommandType.ChatInput,
        name: 'lgbtqsearch',
        description: 'Search for definitions of LGBTQIA+ sexualities and terms.',
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: 'term',
                description: 'The term or sexuality to look up (e.g., agender, bi, nonbinary).',
                required: true
            },
            // NEW OPTIONAL USER OPTION
            {
                type: ApplicationCommandOptionType.User,
                name: 'member',
                description: 'Optional: A member to ping with the result.',
                required: false // It's optional
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
        
        const searchTerm = chatInteraction.options.getString('term', true);
        // Retrieve the optional user/member
        const targetMember = chatInteraction.options.getMember('member');
        
        await chatInteraction.deferReply(); 
        
        const termData = await searchLgbtqTerm(searchTerm);
        
        let replyEmbed: EmbedBuilder;
        let content: string = '';

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
            
            // Add member mention to the reply content if a member was provided
            if (targetMember) {
                 content = `Hey ${targetMember}! Here is the information you requested about **${searchTerm}**.`;
            }

        } else {
            replyEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('Term Not Found 🔎')
                .setDescription(`Could not find a definition for **"${searchTerm}"** in the English database. Please try a different spelling or a more general term.`)
                .setFooter({ text: `API Source: en.pronouns.page` });

             // Still mention the member if the term wasn't found, so they get the notification
            if (targetMember) {
                content = `${targetMember}, I couldn't find a definition for **${searchTerm}**.`;
            }
        }

        await chatInteraction.editReply({ 
            content: content, // The ping/message outside the embed
            embeds: [replyEmbed]
        });
    },
};

export default lgbtqSearchCommand;