import mongoose from "mongoose";
import { getEnv } from "@/lib/env";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

declare global {
  var _mongooseCache: Cache | undefined;
}

const cache: Cache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const { MONGODB_URI } = getEnv();
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  try {
    if (!cache.conn) cache.conn = await cache.promise;
  } catch (error) {
    // Clear the rejected promise so a later call (e.g. after fixing MONGODB_URI)
    // can retry without restarting the process.
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}
