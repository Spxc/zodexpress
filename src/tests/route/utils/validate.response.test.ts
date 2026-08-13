import { afterEach, describe, expect, it, vi } from "vitest";
import { _private } from "../../../route";
import { data, invalidData, responseSchema } from "../../mocks";
import { mockedRequest } from "../../../setup";

function runValidateResponse(
  schema: Parameters<typeof _private.validateResponse>[0],
  options: { method?: string; originalUrl?: string; statusCode?: number } = {},
) {
  const middleware = _private.validateResponse(schema);
  const req = {
    method: options.method ?? "GET",
    originalUrl: options.originalUrl ?? "/test",
  };
  const res = mockedRequest(options.statusCode);
  // res.json/res.send get reassigned inside the middleware to wrapper closures,
  // so we keep a handle to the original spies to assert against.
  const originalJson = res.json;
  const originalSend = res.send;
  const next = vi.fn();

  middleware(req as any, res as any, next);

  return { req, res, next, originalJson, originalSend };
}

describe("validateResponse", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("calls next when schema is not provided", () => {
    const { originalJson, next } = runValidateResponse(undefined);

    expect(next).toHaveBeenCalledTimes(1);
    expect(originalJson).not.toHaveBeenCalled();
  });

  it("passes body through unchanged when no schema matches the status code", () => {
    const { res, originalJson, next } = runValidateResponse(
      { response: { 201: responseSchema } } as any,
      { statusCode: 200 },
    );

    res.json({ ok: true });

    expect(next).toHaveBeenCalledTimes(1);
    expect(originalJson).toHaveReturnedWith({ ok: true });
  });

  it("validates and returns parsed data when res.json is called with a valid body", () => {
    const { res } = runValidateResponse(
      { response: { 200: responseSchema } } as any,
      { statusCode: 200 },
    );

    const result = res.json({ ok: data.ok });

    expect(result).toEqual({ ok: data.ok });
  });

  it("validates res.send the same way when not called from within res.json", () => {
    const { res } = runValidateResponse(
      { response: { 200: responseSchema } } as any,
      { statusCode: 200 },
    );

    const result = res.send({ ok: data.ok });

    expect(result).toEqual({ ok: data.ok });
  });

  it("does not re-validate res.send when called from within res.json", () => {
    process.env.NODE_ENV = "production";
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { res, originalSend } = runValidateResponse(
      { response: { 200: responseSchema } } as any,
      { statusCode: 200 },
    );

    const result = res.json(invalidData);

    // validate() ran once (inside res.json), logged once; the chained
    // this.send(...) call must NOT re-run validate() a second time
    expect(result).toEqual(invalidData);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(originalSend).toHaveBeenCalledWith(invalidData);

    consoleSpy.mockRestore();
  });

  it("throws in non-production when the response fails validation", () => {
    process.env.NODE_ENV = "development";

    const { res } = runValidateResponse(
      { response: { 200: responseSchema } } as any,
      { statusCode: 200, method: "GET", originalUrl: "/widgets" },
    );

    expect(() => res.json(invalidData)).toThrow(/Response validation failed/);
    expect(() => res.json(invalidData)).toThrow(/GET \/widgets \[200\]/);
  });

  it("logs and passes the original body through in production when validation fails", () => {
    process.env.NODE_ENV = "production";
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { res } = runValidateResponse(
      { response: { 200: responseSchema } } as any,
      { statusCode: 200 },
    );

    const result = res.json(invalidData);

    expect(result).toEqual(invalidData);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Response validation failed:",
      expect.any(Array),
    );

    consoleSpy.mockRestore();
  });
});
