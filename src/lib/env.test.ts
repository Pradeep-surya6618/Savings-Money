import { describe, it, expect } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("accepts a valid mongodb uri", () => {
    const env = parseEnv({ MONGODB_URI: "mongodb+srv://u:p@cluster/db" });
    expect(env.MONGODB_URI).toContain("mongodb");
  });
  it("throws a clear error when MONGODB_URI is missing", () => {
    expect(() => parseEnv({})).toThrow(/MONGODB_URI/);
  });
  it("throws when MONGODB_URI is not a mongo connection string", () => {
    expect(() => parseEnv({ MONGODB_URI: "http://nope" })).toThrow(/MONGODB_URI/);
  });
});
