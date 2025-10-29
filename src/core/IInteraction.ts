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
  // The custom ID that this interaction responds to
  // Can be exact match or a function for pattern matching
  customId: string | ((customId: string) => boolean);
  
  // Execute function that handles the interaction
  execute: (interaction: InteractionType) => Promise<void>;
}

export type InteractionCollection = Collection<string, IInteraction>;