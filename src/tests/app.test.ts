import { afterEach, describe, expect, it, vi } from "vitest";
import { mockedZodExpress } from "../setup";

const mocks = vi.hoisted(() => {
  const createZodExpressApp = vi.fn<(...args: any[]) => any>(
    (app, options) => ({
      app,
      options,
    }),
  );

  const expressFactory = vi.fn(() => ({
    use: vi.fn(),
  }));

  const expressJson = vi.fn(() => "json-middleware");

  (expressFactory as any).json = expressJson;

  return {
    createZodExpressApp,
    expressFactory,
    expressJson,
  };
});

vi.mock("express", () => ({
  default: mocks.expressFactory,
}));

vi.mock("../route", () => ({
  createZodExpressApp: mocks.createZodExpressApp,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("makeApp", () => {
  it("creates an express app, installs json middleware, and delegates to createZodExpressApp", async () => {
    const expected = { ok: true };

    mocks.createZodExpressApp.mockReturnValueOnce(expected);

    const result = mockedZodExpress();

    expect(result).toBe(expected);
    expect(mocks.expressFactory).toHaveBeenCalledTimes(1);
    expect(mocks.expressJson).toHaveBeenCalledTimes(1);
    expect(mocks.createZodExpressApp).toHaveBeenCalledTimes(1);

    const [appArg, optionsArg] = mocks.createZodExpressApp.mock.calls[0];

    expect(appArg.use).toHaveBeenCalledWith("json-middleware");

    await expect(optionsArg.verifyToken("any-token")).resolves.toEqual({
      id: "user-1",
    });
  });

  it("passes a custom verifyToken implementation", async () => {
    const verifyToken = vi.fn(async (token: string) => ({
      id: `user-${token}`,
    }));
    mockedZodExpress(verifyToken);

    const [, optionsArg] = mocks.createZodExpressApp.mock.calls[0];
    expect(optionsArg.verifyToken).toBe(verifyToken);

    await expect(optionsArg.verifyToken("42")).resolves.toEqual({
      id: "user-42",
    });
  });
});
