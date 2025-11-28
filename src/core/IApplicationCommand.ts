import {
    RESTPostAPIApplicationCommandsJSONBody,
    Collection,
    CommandInteraction,
    CacheType, 
    PermissionResolvable
} from 'discord.js';

import { CustomClient } from '../types'; 

export interface IApplicationCommand {

    data: RESTPostAPIApplicationCommandsJSONBody;
    
    permissions: 'user' | 'admin'| 'developer'; 
    defaultMemberPermissions?: PermissionResolvable; 

    // This line is correct and defines two expected arguments: 'interaction' and 'client'.
    execute: (interaction: CommandInteraction<CacheType>, client: CustomClient) => Promise<any>;
}

export type CommandCollection = Collection<string, IApplicationCommand>;