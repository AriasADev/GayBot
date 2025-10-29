import { ClientEvents } from 'discord.js';

export interface IEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  // The event name from Discord.js ClientEvents
  name: K;
  
  // Whether this event should only run once
  once?: boolean;
  
  // Execute function that handles the event
  execute: (...args: ClientEvents[K]) => Promise<void> | void;
}

export type EventCollection = Map<string, IEvent>;