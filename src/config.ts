// src/config.ts (CORRECTED)
import { ActivityType } from 'discord.js';
// import { UserData } from './types'; 

// --- Core Configuration ---
export const DB_TYPE = process.env.DB_TYPE as 'MONGO' | 'SQLITE';
export const CLIENT_ID = process.env.CLIENT_ID as string;
export const GUILD_ID = process.env.GUILD_ID as string;


// --- Bot Presence/Activity ---
export const ACTIVITIES = [
    { name: 'Gayness', type: ActivityType.Watching },
];