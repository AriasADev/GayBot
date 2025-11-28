// // src/db/SqliteAdapter.ts (CORRECTED - Proper Transaction Handling)
// import Database from 'better-sqlite3';
// import { IDatabase } from './IDatabase';
// import { UserData } from '../types';
// import { DEFAULT_USER_DATA } from '../schemas/UserSchema';
// import { errorTracker } from '../core/errorTracker';

// const TABLE_NAME = 'users';

// export class SqliteAdapter implements IDatabase {
//     private db!: Database.Database;
//     private path: string;

//     constructor(path: string) {
//         this.path = path;
//     }

//     async connect(): Promise<void> {
//         try {
//             this.db = new Database(this.path);
//             this.db.pragma('journal_mode = WAL');
//             this.initializeSchema();
//             console.log('📦 SQLite Connected successfully.');
//         } catch (error) {
//             const errorId = errorTracker.trackError(error, 'startup');
//             console.error(`❌ DB Connection Failed (Error ID: ${errorId})`);
//             process.exit(1);
//         }
//     }

//     private initializeSchema(): void {
//         const createTable = `
//             CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
//                 userId TEXT PRIMARY KEY,
//                 data TEXT NOT NULL
//             );
//         `;
//         this.db.exec(createTable);
//     }

//     private parseUser(row: { userId: string, data: string } | undefined): UserData | null {
//         if (!row) return null;
//         return { userId: row.userId, ...JSON.parse(row.data) };
//     }

//     async getUser(userId: string): Promise<UserData | null> {
//         const statement = this.db.prepare(`SELECT * FROM ${TABLE_NAME} WHERE userId = ?`);
//         const row = statement.get(userId) as { userId: string, data: string } | undefined;
//         return this.parseUser(row);
//     }

//     async getOrCreateUser(userId: string): Promise<UserData> {
//         const user = await this.getUser(userId);
//         if (user) return user;

//         const data = JSON.stringify(DEFAULT_USER_DATA);
//         const statement = this.db.prepare(`INSERT INTO ${TABLE_NAME} (userId, data) VALUES (?, ?)`);
//         statement.run(userId, data);
        
//         return { userId, ...DEFAULT_USER_DATA };
//     }

//     async updateUser(userId: string, data: Partial<UserData>): Promise<UserData | null> {
//         const existingUser = await this.getOrCreateUser(userId);
//         const mergedData = { ...existingUser, ...data };
        
//         const mergedJson = JSON.stringify(mergedData);
//         const statement = this.db.prepare(`UPDATE ${TABLE_NAME} SET data = ? WHERE userId = ?`);
//         statement.run(mergedJson, userId);

//         return mergedData;
//     }

//     async getLeaderboard(key: keyof UserData, limit: number): Promise<UserData[]> {
//         const statement = this.db.prepare(`SELECT * FROM ${TABLE_NAME}`);
//         const rows = statement.all() as { userId: string, data: string }[];
//         const users = rows.map(row => this.parseUser(row)).filter((u): u is UserData => u !== null);

//         return users
//             .sort((a, b) => (b[key] as number) - (a[key] as number))
//             .slice(0, limit);
//     }

//     // FIXED: Synchronous transaction method for better-sqlite3
//     transaction<T>(callback: () => T): T {
//         // Create a synchronous transaction wrapper
//         const transactionFn = this.db.transaction(callback);
        
//         try {
//             // Execute the transaction synchronously
//             return transactionFn();
//         } catch (error) {
//             const errorId = errorTracker.trackError(error, 'unknown');
//             console.error(`❌ SQLite Transaction Failed (Error ID: ${errorId})`);
//             throw error;
//         }
//     }

//     // NEW: Helper method for synchronous user updates (for use in transactions)
//     updateUserSync(userId: string, data: Partial<UserData>): UserData {
//         // Get existing user synchronously
//         const statement = this.db.prepare(`SELECT * FROM ${TABLE_NAME} WHERE userId = ?`);
//         const row = statement.get(userId) as { userId: string, data: string } | undefined;
        
//         let existingUser: UserData;
//         if (row) {
//             existingUser = this.parseUser(row)!;
//         } else {
//             // Create new user
//             existingUser = { userId, ...DEFAULT_USER_DATA };
//             const insertStmt = this.db.prepare(`INSERT INTO ${TABLE_NAME} (userId, data) VALUES (?, ?)`);
//             insertStmt.run(userId, JSON.stringify(DEFAULT_USER_DATA));
//         }

//         // Merge and update
//         const mergedData = { ...existingUser, ...data };
//         const mergedJson = JSON.stringify(mergedData);
//         const updateStmt = this.db.prepare(`UPDATE ${TABLE_NAME} SET data = ? WHERE userId = ?`);
//         updateStmt.run(mergedJson, userId);

//         return mergedData;
//     }

//     // NEW: Helper to get user synchronously (for use in transactions)
//     getUserSync(userId: string): UserData | null {
//         const statement = this.db.prepare(`SELECT * FROM ${TABLE_NAME} WHERE userId = ?`);
//         const row = statement.get(userId) as { userId: string, data: string } | undefined;
//         return this.parseUser(row);
//     }
// }