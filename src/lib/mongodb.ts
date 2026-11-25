import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || "mongodb+srv://i4uzats011_db_user:K7X5BETnFdTgTgTE@cluster0.2gn7lxt.mongodb.net/focustube?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.MONGO_DB || "focustube";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let indexesEnsured = false;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 50,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 8000,
  });

  await client.connect();
  const db = client.db(dbName);

  // Ensure high-speed compound indexes once
  if (!indexesEnsured) {
    indexesEnsured = true;
    ensureIndexes(db).catch(err => console.warn('[MongoDB] Index creation warning:', err));
  }

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

async function ensureIndexes(db: Db) {
  try {
    await Promise.allSettled([
      db.collection('companies').createIndex({ name: 1 }),
      db.collection('branches').createIndex({ companyId: 1, name: 1 }),
      db.collection('branches').createIndex({ companyId: 1, code: 1 }),
      
      // Vouchers: Highly optimized compound indexes for instant ledger queries
      db.collection('vouchers').createIndex({ companyId: 1, "lines.account": 1, isIgnored: 1, date: 1 }),
      db.collection('vouchers').createIndex({ companyId: 1, branchId: 1, "lines.account": 1, isIgnored: 1, date: 1 }),
      db.collection('vouchers').createIndex({ companyId: 1, isIgnored: 1, date: -1 }),
      db.collection('vouchers').createIndex({ companyId: 1, branchId: 1, date: -1 }),
      
      // Party balances: Optimized for Matrix and ledger search
      db.collection('party_balances').createIndex({ companyId: 1, branchId: 1, partyName: 1 }, { unique: true }),
      db.collection('party_balances').createIndex({ companyId: 1, partyName: 1 }),
      db.collection('party_balances').createIndex({ partyName: 1 }),
      db.collection('party_balances').createIndex({ companyId: 1, netBalance: -1 }),

      // Ledger groups & mappings
      db.collection('ledger_groups').createIndex({ companyId: 1, partyName: 1 }),
      db.collection('ledger_groups').createIndex({ companyId: 1, groupName: 1 }),
      db.collection('branch_ledger_mappings').createIndex({ companyId: 1, partyName: 1 }, { unique: true }),
      db.collection('branch_ledger_mappings').createIndex({ companyId: 1, targetBranchCode: 1 })
    ]);
    console.log('[MongoDB] Compound indexes verified and active.');
  } catch (err) {
    console.warn('[MongoDB] Index creation warning:', err);
  }
}
