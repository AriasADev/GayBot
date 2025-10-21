import { EmojiMapEntry } from './types';
import * as config from './emoji-config.json';

const importedConfig = config as any;
const emojiMap: EmojiMapEntry[] = (Array.isArray(importedConfig) 
    ? importedConfig 
    : importedConfig.default) as EmojiMapEntry[];

export class KeywordChecker {

    private emojiMap: EmojiMapEntry[];

    constructor() {
        this.emojiMap = emojiMap;
        console.log(`KeywordChecker initialized and loaded ${this.emojiMap.length} emoji categories.`);
    }

    public getMatchingEmojis(messageContent: string): string[] {
        if (!messageContent || typeof messageContent !== 'string') {
            return [];
        }

        const lowerMessage = messageContent.toLowerCase();

        const foundEmojis = new Set<string>();

        this.emojiMap.forEach(item => {
            const matchFound = item.keywords.some(keyword => {
                return lowerMessage.includes(keyword.toLowerCase());
            });

            if (matchFound) {
                foundEmojis.add(item.emoji);
            }
        });

        return Array.from(foundEmojis);
    }
}
