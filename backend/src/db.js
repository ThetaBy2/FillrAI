import { MongoClient } from 'mongodb';

let client;
let db;

export async function connect() {
  client = new MongoClient(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'fillrai');
}

export const col = (name) => db.collection(name);

export const ping = () => client.db('admin').command({ ping: 1 });

// We use simple integer ids (1, 2, 3, ...) instead of Mongo ObjectIds.
// The `counters` collection keeps the last id used for each collection.
export async function nextId(collection) {
  const counter = await col('counters').findOneAndUpdate(
    { _id: collection },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return counter.seq;
}

export async function insert(collection, data) {
  const doc = { ...data, id: data.id ?? (await nextId(collection)) };
  await col(collection).insertOne(doc);
  return doc;
}

// Strip Mongo's internal _id and the password hash before sending a document to the browser.
export function clean({ _id, hashed_password, ...doc }) {
  return doc;
}

export function notify(userId, title, body, kind = 'info', link = null) {
  return insert('notifications', {
    user_id: userId,
    title,
    body,
    kind,
    link,
    is_read: false,
    created_at: new Date(),
  });
}

