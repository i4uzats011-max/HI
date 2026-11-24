import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || "mongodb+srv://i4uzats011_db_user:K7X5BETnFdTgTgTE@cluster0.2gn7lxt.mongodb.net/focustube?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.MONGO_DB || "focustube";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
  });

  await client.connect();
  const db = client.db(dbName);

  // Ensure indexes for fast queries
  try {
    await Promise.all([
      db.collection('companies').createIndex({ name: 1 }),
      db.collection('branches').createIndex({ companyId: 1, name: 1 }),
      db.collection('vouchers').createIndex({ companyId: 1, branchId: 1, date: -1 }),
      db.collection('vouchers').createIndex({ companyId: 1, "lines.account": 1 }),
      db.collection('vouchers').createIndex({ branchId: 1, "lines.account": 1 }),
      db.collection('party_balances').createIndex({ companyId: 1, branchId: 1, partyName: 1 }, { unique: true }),
      db.collection('party_balances').createIndex({ partyName: 1 })
    ]);
  } catch (err) {
    console.warn("Index creation notice:", err);
  }

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
