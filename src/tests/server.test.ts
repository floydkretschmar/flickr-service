import { afterEach, describe, expect, it, vi } from "vitest";
import Server from "../server.js";
import { Express } from "express";

vi.mock("cors", async () => {
  return {
    default: vi.fn().mockImplementation((options) => options),
  };
});
vi.mock("express-rate-limit", async () => {
  return {
    default: vi.fn().mockImplementation((options) => options),
  };
});
describe("Server", () => {
  it("should configure cors for defined urls", async () => {
    const use = vi.fn();
    const set = vi.fn();
    const express: Partial<Express> = { use, set };

    const server: Server = new Server(express as Express);

    server.configureCORS(["origin1", "origin2"]);

    expect(use).toHaveBeenCalled();
    const configuredOriginFunction = use.mock.calls[0][0].origin;
    configuredOriginFunction("origin1", (err: Error, allowed: any) =>
      expect(allowed).toBeTruthy(),
    );
    configuredOriginFunction("origin2", (err: Error, allowed: any) =>
      expect(allowed).toBeTruthy(),
    );
    configuredOriginFunction("origin3", (err: Error, allowed: any) => {
      expect(allowed).toBeFalsy();
      expect(err.message).toBe("Not allowed by CORS");
    });
    expect(set).toHaveBeenCalledWith("trust proxy", 1);
  });
  it("should allow cors for any url if * origin is defined", async () => {
    const use = vi.fn();
    const set = vi.fn();
    const express: Partial<Express> = { use, set };

    const server: Server = new Server(express as Express);

    server.configureCORS(["*"]);

    expect(use).toHaveBeenCalled();
    const configuredOriginFunction = use.mock.calls[0][0].origin;
    configuredOriginFunction("origin1", (err: Error, allowed: any) =>
      expect(allowed).toBeTruthy(),
    );
    configuredOriginFunction("origin2", (err: Error, allowed: any) =>
      expect(allowed).toBeTruthy(),
    );
    configuredOriginFunction("origin3", (err: Error, allowed: any) => {
      expect(allowed).toBeTruthy();
    });
    expect(set).toHaveBeenCalledWith("trust proxy", 1);
  });
  it("should start on provided port", async () => {
    const listen = vi.fn();
    const express: Partial<Express> = { listen };

    const server: Server = new Server(express as Express);

    server.start(3000);

    expect(listen.mock.calls[0][0]).toBe(3000);
  });
  it("should register get requests according to configuration with rate limit", async () => {
    const use = vi.fn();
    const get = vi.fn();
    const express: Partial<Express> = { use, get };

    const server: Server = new Server(express as Express);

    server.get(
      "/foo",
      (req, res) => {
        return "result";
      },
      20,
    );

    expect(use.mock.calls[0][0]).toEqual("/foo");
    const configuredRateLimitOptions = use.mock.calls[0][1];
    expect(configuredRateLimitOptions).toEqual({ windowMs: 60000, limit: 20 });

    expect(get.mock.calls[0][0]).toEqual("/foo");
    expect(get.mock.calls[0][1]("test", "test")).toEqual("result");
  });
});
