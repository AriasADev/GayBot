// import { UserData } from '../types';

// /**
//  * Defines the contract for all database adapters (Mongo, SQLite).
//  * All application logic must only interact with this interface.
//  */
// export interface IDatabase {
//   connect(): Promise<void>;
  
//   // Core CRUD Operations
//   getUser(userId: string): Promise<UserData | null>;
//   getOrCreateUser(userId: string): Promise<UserData>;
//   updateUser(userId: string, data: Partial<UserData>): Promise<UserData | null>;
  
//   // Leaderboards
//   getLeaderboard(key: keyof UserData, limit: number): Promise<UserData[]>;

//   /**
//    * Runs a set of operations atomically (transactionally).
//    * @param callback The function containing database operations.
//    */
//   transaction<T>(callback: () => Promise<T>): Promise<T>;
// }