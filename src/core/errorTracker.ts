import { randomBytes } from 'crypto';
import { User, Message, PartialMessage, Interaction } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

export interface ErrorContext {
    errorId: string;
    timestamp: string;
    user: {
        id: string;
        username: string;
        tag: string;
    } | null;
    source: 'reaction' | 'command' | 'messageCreate' | 'messageUpdate' | 'deployment' | 'startup' | 'unknown';
    command: string | null;
    errorMessage: string;
    errorStack: string | null;
    additionalContext: Record<string, any>;
}

export class ErrorTracker {
    private static instance: ErrorTracker;
    private logDirectory: string;
    private errorLog: ErrorContext[] = [];

    private constructor() {
        this.logDirectory = path.join(process.cwd(), '.logs');
        this.ensureLogDirectory();
    }

    public static getInstance(): ErrorTracker {
        if (!ErrorTracker.instance) {
            ErrorTracker.instance = new ErrorTracker();
        }
        return ErrorTracker.instance;
    }

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.logDirectory)) {
            fs.mkdirSync(this.logDirectory, { recursive: true });
        }
    }

    private generateErrorId(): string {
        // Generate a 16-character hexadecimal UUID
        return randomBytes(8).toString('hex').toUpperCase();
    }

    private extractUserInfo(user: User | null): ErrorContext['user'] {
        if (!user) return null;
        
        return {
            id: user.id,
            username: user.username,
            tag: user.tag || `${user.username}#${user.discriminator}`
        };
    }

    public trackError(
        error: Error | unknown,
        source: ErrorContext['source'],
        options: {
            user?: User | null;
            command?: string | null;
            message?: Message | PartialMessage | null;
            interaction?: Interaction | null;
            additionalContext?: Record<string, any>;
        } = {}
    ): string {
        const errorId = this.generateErrorId();
        const timestamp = new Date().toISOString();

        // Determine user from various sources
        let user: User | null = options.user || null;
        if (!user && options.message && !options.message.partial) {
            user = options.message.author;
        }
        if (!user && options.interaction) {
            user = options.interaction.user;
        }

        // Extract error information
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack || null : null;

        // Build additional context
        const additionalContext: Record<string, any> = {
            ...(options.additionalContext || {})
        };

        // Add message context if available
        if (options.message) {
            additionalContext.messageId = options.message.id;
            additionalContext.channelId = options.message.channelId;
            if (!options.message.partial) {
                additionalContext.messageContent = options.message.content?.substring(0, 100); // First 100 chars
                additionalContext.guildId = options.message.guildId;
            }
        }

        // Add interaction context if available
        if (options.interaction) {
            additionalContext.interactionId = options.interaction.id;
            additionalContext.channelId = options.interaction.channelId;
            additionalContext.guildId = options.interaction.guildId;
            additionalContext.interactionType = options.interaction.type;
        }

        const errorContext: ErrorContext = {
            errorId,
            timestamp,
            user: this.extractUserInfo(user),
            source,
            command: options.command || null,
            errorMessage,
            errorStack,
            additionalContext
        };

        // Log to console
        this.logToConsole(errorContext);

        // Store in memory
        this.errorLog.push(errorContext);

        // Write to file
        this.writeToFile(errorContext);

        return errorId;
    }

    private logToConsole(error: ErrorContext): void {
        console.error('\n╔═══════════════════════════════════════════════════════════════╗');
        console.error(`║ ERROR TRACKED: ${error.errorId}`);
        console.error('╠═══════════════════════════════════════════════════════════════╣');
        console.error(`║ Timestamp: ${error.timestamp}`);
        console.error(`║ Source: ${error.source}`);
        if (error.command) {
            console.error(`║ Command: ${error.command}`);
        }
        if (error.user) {
            console.error(`║ User: ${error.user.username} (${error.user.id})`);
        }
        console.error(`║ Error: ${error.errorMessage}`);
        console.error('╠═══════════════════════════════════════════════════════════════╣');
        if (error.errorStack) {
            console.error('║ Stack Trace:');
            const stackLines = error.errorStack.split('\n');
            stackLines.forEach(line => {
                console.error(`║   ${line}`);
            });
        }
        if (Object.keys(error.additionalContext).length > 0) {
            console.error('║ Additional Context:');
            console.error(`║   ${JSON.stringify(error.additionalContext, null, 2).split('\n').join('\n║   ')}`);
        }
        console.error('╚═══════════════════════════════════════════════════════════════╝\n');
    }

    private writeToFile(error: ErrorContext): void {
        try {
            const filename = `${error.errorId}.txt`;
            const filepath = path.join(this.logDirectory, filename);

            // Build the formatted error content
            let content = '';
            content += '╔═══════════════════════════════════════════════════════════════╗\n';
            content += `║ ERROR TRACKED: ${error.errorId}\n`;
            content += '╠═══════════════════════════════════════════════════════════════╣\n';
            content += `║ Timestamp: ${error.timestamp}\n`;
            content += `║ Source: ${error.source}\n`;
            
            if (error.command) {
                content += `║ Command: ${error.command}\n`;
            }
            
            if (error.user) {
                content += `║ User: ${error.user.username} (${error.user.id})\n`;
            }
            
            content += `║ Error: ${error.errorMessage}\n`;
            content += '╠═══════════════════════════════════════════════════════════════╣\n';
            
            if (error.errorStack) {
                content += '║ Stack Trace:\n';
                const stackLines = error.errorStack.split('\n');
                stackLines.forEach(line => {
                    content += `║   ${line}\n`;
                });
            }
            
            if (Object.keys(error.additionalContext).length > 0) {
                content += '║ Additional Context:\n';
                const contextStr = JSON.stringify(error.additionalContext, null, 2);
                const contextLines = contextStr.split('\n');
                contextLines.forEach(line => {
                    content += `║   ${line}\n`;
                });
            }
            
            content += '╚═══════════════════════════════════════════════════════════════╝\n';

            // Write to file
            fs.writeFileSync(filepath, content, 'utf-8');
        } catch (writeError) {
            console.error('Failed to write error to file:', writeError);
        }
    }

    public getErrorById(errorId: string): ErrorContext | undefined {
        return this.errorLog.find(e => e.errorId === errorId);
    }

    public getRecentErrors(limit: number = 10): ErrorContext[] {
        return this.errorLog.slice(-limit);
    }

    public clearMemoryLog(): void {
        this.errorLog = [];
    }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();