import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

describe("encryptSecret", () => {
  beforeEach(() => vi.stubEnv("CREDENTIALS_KEY", randomBytes(32).toString("base64")));
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips, and never stores the plain text", () => {
    const stored = encryptSecret("abcd efgh ijkl mnop");
    expect(stored).not.toContain("abcd");
    expect(decryptSecret(stored)).toBe("abcd efgh ijkl mnop");
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("rejects tampered data", () => {
    const [v, iv, tag, data] = encryptSecret("secret").split(":");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 1;
    expect(() => decryptSecret([v, iv, tag, flipped.toString("base64")].join(":"))).toThrow();
  });

  it("fails clearly without a valid key", () => {
    vi.stubEnv("CREDENTIALS_KEY", "too-short");
    expect(() => encryptSecret("x")).toThrow(/32 bytes/);
  });
});
