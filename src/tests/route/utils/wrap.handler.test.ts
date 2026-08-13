import { afterEach, describe, expect, it, vi } from "vitest";
import { _private } from "../../../route";
import { mockedRequest } from "../../../setup";

describe("wrapHandler", () => {
  const req = {} as any;
  const next = vi.fn();
  const handler = vi.fn();
  const handlerOk = vi.fn(async () => "ok");
  const handlerError = (error: Error) =>
    vi.fn(() => {
      throw error;
    });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a function", () => {
    const handler = vi.fn();
    const wrapped = _private.wrapHandler(handler);

    expect(typeof wrapped).toBe("function");
  });

  it("calls the original handler with req, res, next", async () => {
    const _req = { ...req, params: { id: "1" } } as any;
    const _res = mockedRequest();

    const wrapped = _private.wrapHandler(handler);

    await wrapped(_req, _res as any, next);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(_req, _res, next);
  });

  it("sends the handler's return value as a 200 JSON response", async () => {
    const res = mockedRequest();
    const wrapped = _private.wrapHandler(handlerOk);

    await wrapped(req, res as any, next);

    expect(handlerOk).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith("ok");
    expect(next).not.toHaveBeenCalled();
  });

  it("does not send a response when the handler returns undefined", async () => {
    const res = mockedRequest();
    const wrapped = _private.wrapHandler(handler); // vi.fn() resolves to undefined

    await wrapped(req, res as any, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("does not send a response when headers were already sent", async () => {
    const res = mockedRequest();
    res.headersSent = true;
    const wrapped = _private.wrapHandler(handlerOk);

    await wrapped(req, res as any, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("does not send a response when the handler returns res itself", async () => {
    const res = mockedRequest();
    const handlerReturnsRes = vi.fn(async (_req, r) => r);
    const wrapped = _private.wrapHandler(handlerReturnsRes as any);

    await wrapped(req, res as any, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards synchronous errors to next", async () => {
    const res = mockedRequest();
    const error = new Error("sync failure");

    const wrapped = _private.wrapHandler(handlerError(error));
    await wrapped(req, res as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });

  it("forwards async rejections to next", async () => {
    const res = mockedRequest();
    const error = new Error("async failure");

    const wrapped = _private.wrapHandler(handlerError(error));
    await wrapped(req, res as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });
});
