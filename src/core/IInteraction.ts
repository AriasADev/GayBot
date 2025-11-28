import {
  Collection,
  ButtonInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  RoleSelectMenuInteraction,
  ChannelSelectMenuInteraction,
  MentionableSelectMenuInteraction,
  ModalSubmitInteraction,
  AnySelectMenuInteraction,
} from 'discord.js';
import { CustomClient } from '../types'; 

export type InteractionType =
  | ButtonInteraction
  | StringSelectMenuInteraction
  | UserSelectMenuInteraction
  | RoleSelectMenuInteraction
  | ChannelSelectMenuInteraction
  | MentionableSelectMenuInteraction
  | ModalSubmitInteraction
  | AnySelectMenuInteraction;

export interface IInteraction {
  customId: string | ((customId: string) => boolean);
  
execute: (interaction: InteractionType, client: CustomClient) => Promise<any>;
}

export type InteractionCollection = Collection<string, IInteraction>;