// One-time fresh-start migration for the multi-loan model:
//   1. Drop the old `userId_1` UNIQUE index on `loans` (Mongoose won't drop it
//      automatically when `unique: true` is removed from the schema).
//   2. Delete all existing loan docs (fresh start — no per-user single loan).
// Run once per environment: `node scripts/migrate-multi-loan.mjs`
import { readFileSync } from "node:fs";
import mongoose from "mongoose";

function readEnv(key) {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i === -1) continue;
      if (line.slice(0, i).trim() === key) {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* no .env.local — fall back to process.env */
  }
  return undefined;
}

const uri = process.env.MONGODB_URI ?? readEnv("MONGODB_URI");
if (!uri) {
  console.error("MONGODB_URI not found (set it or add to .env.local)");
  process.exit(1);
}

await mongoose.connect(uri);
const loans = mongoose.connection.collection("loans");

try {
  await loans.dropIndex("userId_1");
  console.log("Dropped unique index userId_1");
} catch (e) {
  console.log(`userId_1 index not dropped (ok): ${e.codeName ?? e.message}`);
}

const res = await loans.deleteMany({});
console.log(`Deleted ${res.deletedCount} loan doc(s) — fresh start.`);

await mongoose.disconnect();
console.log("Multi-loan migration complete.");
