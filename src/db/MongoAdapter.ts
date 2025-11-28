// import mongoose from 'mongoose';
// import { IDatabase } from './IDatabase';
// import { UserData } from '../types';
// import { DEFAULT_USER_DATA, UserModel } from '../schemas/UserSchema'; 
// import { errorTracker } from '../core/errorTracker';

// export class MongoAdapter implements IDatabase {
//     private uri: string;

//     constructor(uri: string) {
//         this.uri = uri;
//     }

//     async connect(): Promise<void> {
//         try {
//             await mongoose.connect(this.uri);
//             console.log('📦 MongoDB Connected successfully.');
//         } catch (error) {
//             const errorId = errorTracker.trackError(error, 'startup');
//             console.error(`❌ DB Connection Failed (Error ID: ${errorId})`);
//             process.exit(1);
//         }
//     }

//     async getUser(userId: string): Promise<UserData | null> {
//         return UserModel.findOne({ userId });
//     }

//     async getOrCreateUser(userId: string): Promise<UserData> {
//         const user = await this.getUser(userId);
//         if (user) return user;

//         const newUser = new UserModel({ userId, ...DEFAULT_USER_DATA });
//         await newUser.save();
//         return newUser;
//     }

//     async updateUser(userId: string, data: Partial<UserData>): Promise<UserData | null> {
//         return UserModel.findOneAndUpdate({ userId }, { $set: data }, { new: true });
//     }

//     async getLeaderboard(key: keyof UserData, limit: number): Promise<UserData[]> {
        
//         // Use an object based on the full UserData type structure for the check.
//         const defaultInstance: UserData = { userId: '', ...DEFAULT_USER_DATA };
        
//         if (typeof defaultInstance[key] !== 'number') {
//             // userId is a string, which should be explicitly filtered if passed here.
//             if (key !== 'userId') {
//                 console.warn(`Attempted to run leaderboard on non-numeric key: ${key}`);
//             }
//             return [];
//         }

//         return UserModel.find({})
//             .sort({ [key]: -1 })
//             .limit(limit)
//             .exec();
//     }

//     async transaction<T>(callback: () => Promise<T>): Promise<T> {
//         const session = await mongoose.startSession();
//         try {
//             let result: T;
//             await session.withTransaction(async () => {
//                 // @ts-ignore result is assigned within the transaction scope
//                 result = await callback();
//             });
//             await session.endSession();
//             // @ts-ignore result is guaranteed to be assigned here
//             return result;
//         } catch (error) {
//             const errorId = errorTracker.trackError(error, 'unknown');
//             console.error(`❌ MongoDB Transaction Failed (Error ID: ${errorId})`);
//             await session.endSession();
//             throw error;
//         }
//     }
// }