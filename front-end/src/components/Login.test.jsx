import { describe, expect, it } from "vitest";
import { normalizeRedirect } from "./Login.jsx";

describe("normalizeRedirect", () => {
  beforeEach(() => {
    // Mimic production basename so normalization strips it
    globalThis.__APP_BASENAME__ = "/cec-employee-database";
  });

  it("returns /home when empty", () => {
    expect(normalizeRedirect(undefined)).toBe("/home");
    expect(normalizeRedirect("")).toBe("/home");
  });

  it("strips full URLs to path + search", () => {
    expect(
      normalizeRedirect("https://example.com/cec-employee-database/home?x=1")
    ).toBe("/home?x=1");
  });

  it("removes the configured basename", () => {
    expect(normalizeRedirect("/cec-employee-database/foo")).toBe("/foo");
  });

  it("ensures leading slash and avoids login loop", () => {
    expect(normalizeRedirect("foo")).toBe("/foo");
    expect(normalizeRedirect("/login?reason=expired")).toBe("/home");
  });
});
