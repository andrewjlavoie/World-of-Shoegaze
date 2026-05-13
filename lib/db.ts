import { MongoClient, type Db, type Document } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "wos";

if (!uri) {
  throw new Error("MONGODB_URI is not set. Copy .env.local.example to .env.local.");
}

// In dev, Next.js HMR re-imports modules. Cache the client on globalThis to
// avoid leaking a new connection pool per HMR cycle.
declare global {
  // eslint-disable-next-line no-var
  var _wosMongo: { client: MongoClient; connect: Promise<MongoClient> } | undefined;
}

const cached = globalThis._wosMongo ?? (globalThis._wosMongo = (() => {
  const client = new MongoClient(uri, { maxPoolSize: 5 });
  return { client, connect: client.connect() };
})());

export async function getDb(): Promise<Db> {
  await cached.connect;
  return cached.client.db(dbName);
}

export async function getCollection<T extends Document>(name: string) {
  const db = await getDb();
  return db.collection<T>(name);
}
