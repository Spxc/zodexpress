import express from "express";
import { createZodExpressApp } from "./route";
import { vi } from "vitest";

export function mockedZodExpress(
  verifyToken: (token: string) => Promise<{ id: string }> = async () => ({
    id: "user-1",
  }),
) {
  const app = express();
  app.use(express.json());

  return createZodExpressApp(app, { verifyToken });
}

export function mockedRequest(statusCode = 200) {
  return {
    statusCode,
    headersSent: false, 
    status: vi.fn().mockReturnThis(),
    json: vi.fn(function (this: any, body?: unknown) {
      return this.send(body);
    }),
    send: vi.fn((body?: unknown) => body),
  };
}
