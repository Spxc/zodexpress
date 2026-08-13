import request from "supertest";
import { describe, it } from "vitest";
import { mockedZodExpress } from "../../setup";
import { Role } from "../../types";
import { bodySchema, data, invalidData, responseSchema } from "../mocks";

describe("Authenticated DELETE route", () => {
  const app = mockedZodExpress();

  it("returns 200 for a route with body", async () => {
    app.zodRoute({
      method: "DELETE",
      url: "/",
      roles: [Role.AUTHENTICATED],
      schema: {
        body: bodySchema,
        response: { 200: responseSchema },
      },
      handler: async (req) => ({
        ok: req.body.id === data.id,
      }),
    });

    await request(app)
      .delete("/")
      .set("Authorization", "Bearer test-token")
      .send(data)
      .expect(200, { ok: true });
  });

  it("returns 401 for a route with invalid body", async () => {
    app.zodRoute({
      method: "DELETE",
      url: "/",
      schema: {
        body: bodySchema,
        response: { 200: responseSchema },
      },
      roles: [Role.PUBLIC],
      handler: async (req) => [data].find((item) => item.id === req.body.id),
    });

    await request(app).delete("/").send(invalidData).expect(401);
  });
});
