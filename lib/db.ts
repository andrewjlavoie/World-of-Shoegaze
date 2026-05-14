import { MongoClient, type Db, type Document } from "mongodb";

const dbName = process.env.MONGODB_DB || "wos";

function requireUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local for local dev or to your Vercel project env vars.",
    );
  }
  return uri;
}

// In dev, Next.js HMR re-imports modules. Cache the client on globalThis to
// avoid leaking a new connection pool per HMR cycle.
declare global {
  var _wosMongo: { client: MongoClient; connect: Promise<MongoClient> } | undefined;
}

function getOrCreateCached() {
  if (globalThis._wosMongo) return globalThis._wosMongo;
  const client = new MongoClient(requireUri(), { maxPoolSize: 5 });
  globalThis._wosMongo = { client, connect: client.connect() };
  return globalThis._wosMongo;
}

export async function getDb(): Promise<Db> {
  const cached = getOrCreateCached();
  await cached.connect;
  return cached.client.db(dbName);
}

export async function getCollection<T extends Document>(name: string) {
  const db = await getDb();
  return db.collection<T>(name);
}
