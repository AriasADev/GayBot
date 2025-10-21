import { Message, PartialMessage } from "discord.js";

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