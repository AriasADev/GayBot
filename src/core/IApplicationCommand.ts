import {
    RESTPostAPIApplicationCommandsJSONBody,
    Collection,
    CommandInteraction,
    CacheType, 
    PermissionResolvable,
    AutocompleteInteraction
} from 'discord.js';

import { CustomClient } from '../types'; 

export interface IApplicationCommand {

    data: RESTPostAPIApplicationCommandsJSONBody;
    
    guildIds?: string[];
    permissions: 'user' | 'admin'| 'developer'; 
    defaultMemberPermissions?: PermissionResolvable; 

    // This line is correct and defines two expected arguments: 'interaction' and 'client'.
    execute: (interaction: CommandInteraction<CacheType>, client: CustomClient) => Promise<any>;

    autocomplete?: (interaction: AutocompleteInteraction, client: CustomClient) => Promise<void>;
}

export type CommandCollection = Collection<string, IApplicationCommand>;