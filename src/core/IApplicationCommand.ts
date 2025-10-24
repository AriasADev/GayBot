import {
  RESTPostAPIApplicationCommandsJSONBody,
  Collection,
  CommandInteraction,
} from 'discord.js';

export interface IApplicationCommand {

  data: RESTPostAPIApplicationCommandsJSONBody;
  
  execute: (interaction: CommandInteraction) => Promise<void>;
}

export type CommandCollection = Collection<string, IApplicationCommand>;