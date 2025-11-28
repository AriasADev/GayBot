// import { DB_TYPE } from '../config';
// import { IDatabase } from './IDatabase';
// import { MongoAdapter } from './MongoAdapter';
// import { SqliteAdapter } from './SqliteAdapter';

// export const initializeDatabase = (): IDatabase => {
//     switch (DB_TYPE) {
//         case 'MONGO':
//             if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set in .env for DB_TYPE=MONGO");
//             return new MongoAdapter(process.env.MONGO_URI);
//         case 'SQLITE':
//             if (!process.env.SQLITE_PATH) throw new Error("SQLITE_PATH is not set in .env for DB_TYPE=SQLITE");
//             return new SqliteAdapter(process.env.SQLITE_PATH);
//         default:
//             throw new Error(`Unsupported DB_TYPE: ${DB_TYPE}`);
//     }
// };