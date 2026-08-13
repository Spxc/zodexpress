import { _private } from "../../../route";
import { Role } from "../../../types";
import { describe, it, expect, vi } from "vitest";

describe("checkRoles", () => {
  const createRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  });

  const runMiddleware = async (
    roles: Role[],
    verifyToken = vi.fn(),
    headers: Record<string, string> = {},
  ) => {
    const req: any = { headers };
    const res = createRes();
    const next = vi.fn();
    const middleware = _private.checkRoles(roles, verifyToken);

    await middleware(req, res as any, next);

    return { req, res, next, verifyToken };
  };

  it("returns a middleware function", () => {
    const middleware = _private.checkRoles([Role.PUBLIC], vi.fn());
    expect(middleware).toBeTypeOf("function");
  });

  it("calls next for PUBLIC routes", async () => {
    const { res, next, verifyToken } = await runMiddleware([Role.PUBLIC]);

    expect(next).toHaveBeenCalledOnce();
    expect(verifyToken).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when AUTHENTICATED route has no token", async () => {
    const { res, next } = await runMiddleware([Role.AUTHENTICATED]);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("returns 401 when token verification fails", async () => {
    const verifyToken = vi.fn().mockRejectedValue(new Error("bad token"));
    const { res, next } = await runMiddleware(
      [Role.AUTHENTICATED],
      verifyToken,
      { authorization: "Bearer invalid-token" },
    );

    expect(verifyToken).toHaveBeenCalledWith("invalid-token");
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("sets req.user and calls next when token is valid", async () => {
    const user = { id: "abcs" };
    const verifyToken = vi.fn().mockResolvedValue(user);
    const { req, res, next } = await runMiddleware(
      [Role.AUTHENTICATED],
      verifyToken,
      { authorization: "Bearer valid-token" },
    );

    expect(verifyToken).toHaveBeenCalledWith("valid-token");
    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when no matching role is allowed", async () => {
    const { res, next } = await runMiddleware([]);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });
});
