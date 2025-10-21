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

        const lowerMessage = messageContent.toLowerCase();

        const foundEmojis = new Set<string>();

        this.emojiMap.forEach(item => {
            const matchFound = item.keywords.some(keyword => {
                const lowerKeyword = keyword.toLowerCase();
                
                const escapedKeyword = lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                const pluralization = '(s|es)?';
                
                const regex = new RegExp(`\\b${escapedKeyword}${pluralization}\\b`);
                
                return console.log("TEST:" + regex.test(lowerMessage) );

                
            });

            if (matchFound) {
                foundEmojis.add(item.emoji);
            }
        });

        return Array.from(foundEmojis);
    }
}
