import request from "supertest";
import { describe, it } from "vitest";
import { mockedZodExpress } from "../../setup";
import { Role } from "../../types";
import z from "zod";
import { data, paramsSchema, queryStringSchema } from "../mocks";

const responseSchema = z.object({
  ok: z.boolean(),
});

describe("GET route", () => {
  const app = mockedZodExpress();

  it("returns 200 for a route with no querystring or params", async () => {
    app.zodRoute({
      method: "GET",
      url: "/",
      roles: [Role.PUBLIC],
      schema: {
        response: { 200: responseSchema },
      },
      handler: async () => data,
    });

    await request(app).get("/").expect(200, { ok: true });
  });

  it("returns 200 for a route with querystring", async () => {
    app.zodRoute({
      method: "GET",
      url: "/",
      schema: {
        querystring: queryStringSchema,
        response: { 200: responseSchema },
      },
      roles: [Role.PUBLIC],
      handler: async (req) =>
        [data].find((item) => item.version === req.query.version),
    });

    await request(app)
      .get("/")
      .query({ version: "1.0.0" })
      .expect(200, { ok: true });
  });

  it("returns 200 for a route with params", async () => {
    app.zodRoute({
      method: "GET",
      url: "/:id",
      schema: {
        params: paramsSchema,
        response: { 200: responseSchema },
      },
      roles: [Role.PUBLIC],
      handler: async (req) => [data].find((item) => item.id === req.params.id),
    });

    await request(app).get("/123").expect(200, {
      ok: true,
    });
  });
});
