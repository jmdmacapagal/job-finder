import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedEmail } from "./auth";

describe("isAllowedEmail", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lets in every listed email, ignoring case and spaces", () => {
    vi.stubEnv("ALLOWED_EMAILS", " Owner@Example.com, friend@example.com ");
    expect(isAllowedEmail("owner@example.com")).toBe(true);
    expect(isAllowedEmail("FRIEND@example.com")).toBe(true);
    expect(isAllowedEmail("stranger@example.com")).toBe(false);
    expect(isAllowedEmail(undefined)).toBe(false);
  });

  it("still reads the older single ALLOWED_EMAIL", () => {
    vi.stubEnv("ALLOWED_EMAILS", "");
    vi.stubEnv("ALLOWED_EMAIL", "owner@example.com");
    expect(isAllowedEmail("owner@example.com")).toBe(true);
  });

  it("lets nobody in when no emails are set", () => {
    vi.stubEnv("ALLOWED_EMAILS", "");
    vi.stubEnv("ALLOWED_EMAIL", "");
    expect(isAllowedEmail("owner@example.com")).toBe(false);
  });
});
