import { ClientEvents } from 'discord.js';
import { CustomClient } from '../types'; 

export interface IEvent<K extends keyof ClientEvents = keyof ClientEvents> {
    name: K;
    
    once?: boolean;
    
    execute: (...args: [...ClientEvents[K], CustomClient]) => Promise<void> | void;
}

export type EventCollection = Map<string, IEvent>;