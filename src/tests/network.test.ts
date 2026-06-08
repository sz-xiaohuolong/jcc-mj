import { describe, expect, it } from "vitest";
import { resolveOnlineServerUrl } from "../utils/network";

describe("resolveOnlineServerUrl", () => {
  it("uses an explicit env URL when configured", () => {
    expect(resolveOnlineServerUrl("http://example.test:9999", { hostname: "192.168.3.43", protocol: "http:" })).toBe(
      "http://example.test:9999"
    );
  });

  it("defaults to the current page host for LAN clients", () => {
    expect(resolveOnlineServerUrl(undefined, { hostname: "192.168.3.43", protocol: "http:" })).toBe("http://192.168.3.43:8787");
  });
});
