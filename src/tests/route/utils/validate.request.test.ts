import { describe, expect, it, vi } from "vitest";
import { _private } from "../../../route";
import {
  data,
  invalidData,
  queryStringSchema,
  paramsSchema,
  bodySchema,
  limitSchema,
  invalidLimitData,
  MockReq,
} from "../../mocks";
import { mockedRequest } from "../../../setup";

function runValidateRequest(
  schema: Parameters<typeof _private.validateRequest>[0],
  req: Partial<MockReq> = {},
) {
  const middleware = _private.validateRequest(schema);
  const fullReq = { query: {}, params: {}, body: {}, ...req } as MockReq;
  const res = mockedRequest();
  const next = vi.fn();

  middleware(fullReq as any, res as any, next);

  return { req: fullReq, res, next };
}

describe("validateRequest", () => {
  it("calls next when schema is not provided", () => {
    const { res, next } = runValidateRequest(undefined);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("parses and overwrites query with expected property descriptor", () => {
    const { req, next } = runValidateRequest(
      { querystring: queryStringSchema } as any,
      { query: { version: data.version } },
    );

    expect(req.query).toEqual({ version: data.version });

    const descriptor = Object.getOwnPropertyDescriptor(req, "query");
    expect(descriptor).toBeDefined();
    expect(descriptor?.writable).toBe(true);
    expect(descriptor?.configurable).toBe(true);
    expect(descriptor?.enumerable).toBe(true);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("parses params and body when provided", () => {
    const { req, next } = runValidateRequest(
      { params: paramsSchema, body: bodySchema } as any,
      { params: { id: data.id }, body: { id: data.id } },
    );

    expect(req.params).toEqual({ id: data.id });
    expect(req.body).toEqual({ id: data.id });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("responds with 400 and validation issues on ZodError", () => {
    const { res, next } = runValidateRequest(
      { querystring: queryStringSchema } as any,
      { query: invalidData },
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "ValidationError",
        issues: expect.any(Array),
      }),
    );
  });

  it("passes non-zod errors to next(err)", () => {
    const customError = new Error("Unexpected failure");
    const { res, next } = runValidateRequest(
      {
        body: {
          parse: vi.fn(() => {
            throw customError;
          }),
        },
      } as any,
      { body: { x: 1 } },
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(customError);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("stops at first validation failure and does not parse subsequent parts", () => {
    const paramsParse = vi.fn(() => ({ id: "ok" }));
    const bodyParse = vi.fn(() => ({ ok: true }));

    const { res, next } = runValidateRequest(
      {
        querystring: limitSchema,
        params: { parse: paramsParse },
        body: { parse: bodyParse },
      } as any,
      { query: invalidLimitData, params: { id: "x" }, body: { ok: false } },
    );

    expect(paramsParse).not.toHaveBeenCalled();
    expect(bodyParse).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
