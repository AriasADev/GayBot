import { CacheType, ChatInputCommandInteraction, Client, Collection, GuildMember, Message, PartialMessage } from 'discord.js';
// NOTE: Assuming KeywordChecker is importable from its source
import { KeywordChecker } from './utils/keyword-checker'; 

export interface ObjectAny<T> {
    [key: string]: T;
}


export interface EmojiMapEntry {
    emoji: string;
    title: string;
    keywords: string[];
}

export interface Config {
    targets: ObjectAny<string>;
    emojis: ObjectAny<string>;
    defaultReaction: string;
    interval: number;
    [key: string]: any;
}


export interface QueueEntry {
    message: Message | PartialMessage;
    emoji: string;
}

// --- CLIENT AND HANDLER TYPES ---
export interface CustomClient extends Client {
    commands: Collection<string, any>; // IApplicationCommand
    interactions: Collection<string, any>; // IInteraction
    database: any; // IDatabase
    errorTracker: any; // ErrorTracker
    interactionQueue: Collection<string, Promise<void>>; // For atomicity
    
    // START: ADDITIONS TO SUPPORT KEYWORD AND REACTION QUEUE LOGIC
    /** An instance of the KeywordChecker utility class. */
    keywordChecker: KeywordChecker; 
    /** A queue array for messages awaiting reactions based on keywords. */
    reactionQueue: QueueEntry[];     
    // END: ADDITIONS TO SUPPORT KEYWORD AND REACTION QUEUE LOGIC
}