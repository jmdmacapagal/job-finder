import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptSecret } from "@/lib/crypto";
import { gmailAccountFor } from "./gmail";

describe("gmailAccountFor", () => {
  beforeEach(() => {
    vi.stubEnv("CREDENTIALS_KEY", randomBytes(32).toString("base64"));
    vi.stubEnv("GMAIL_USER", "owner@gmail.com");
    vi.stubEnv("GMAIL_APP_PASSWORD", "owner-pass");
    vi.stubEnv("GMAIL_FROM_NAME", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses the Gmail saved in the user's Settings", () => {
    const profile = { gmail_address: "friend@gmail.com", gmail_app_password_encrypted: encryptSecret("friend-pass") };
    expect(gmailAccountFor(profile, "friend@example.com")).toMatchObject({ user: "friend@gmail.com", pass: "friend-pass" });
  });

  it("lets only the owner fall back to the environment account", () => {
    const empty = { gmail_address: null, gmail_app_password_encrypted: null };
    expect(gmailAccountFor(empty, "Owner@Gmail.com")).toMatchObject({ user: "owner@gmail.com", pass: "owner-pass" });
    expect(gmailAccountFor(empty, "friend@example.com")).toBeNull();
    expect(gmailAccountFor(null, null)).toBeNull();
  });
});
