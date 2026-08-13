import { vi } from "vitest";
import z from "zod";

export type MockReq = {
  query: unknown;
  params: unknown;
  body: unknown;
  [key: string]: unknown;
};

export type MockRes = {
  statusCode: number;
  json: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
};

export const data = {
  id: "123",
  ok: true,
  version: "1.0.0",
};

export const invalidData = {
  udid: "123",
};

export const invalidLimitData = {
  limit: "0",
};

export const queryStringSchema = z.object({
  version: z.string(),
});

export const paramsSchema = z.object({
  id: z.string(),
});

export const bodySchema = z.object({
  id: z.string(),
});

export const responseSchema = z.object({
  ok: z.boolean(),
});

export const limitSchema = z.object({
  limit: z.coerce.number().min(1),
});
