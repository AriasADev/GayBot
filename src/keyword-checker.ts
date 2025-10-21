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
    }

    public getMatchingEmojis(messageContent: string): string[] {
        if (!messageContent || typeof messageContent !== 'string') {
            return [];
        }

        const tokens = messageContent
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 0);

        const foundEmojis = new Set<string>();

        this.emojiMap.forEach(item => {
            const matchFound = item.keywords.some(keyword => {
                return tokens.includes(keyword.toLowerCase());
            });

            if (matchFound) {
                foundEmojis.add(item.emoji);
            }
        });

        return Array.from(foundEmojis);
    }
}