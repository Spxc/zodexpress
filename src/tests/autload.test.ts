import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fg from "fast-glob";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { autoloadRoutes } from "../autoload";

vi.mock("fast-glob");

describe("autoloadRoutes", () => {
  const zodRoute = vi.fn();
  const app = { zodRoute } as any;
  let tmpDir: string;

  beforeEach(() => {
    zodRoute.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoload-test"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("prefixes routes based on file path", async () => {
    const routeFile = path.join(tmpDir, "users", "routes.ts");
    fs.mkdirSync(path.dirname(routeFile), { recursive: true });
    fs.writeFileSync(
      routeFile,
      `export default async function (app) {
        app.zodRoute({ method: "get", url: "/list" });
      }`,
    );

    vi.mocked(fg).mockResolvedValue([routeFile]);

    await autoloadRoutes(app, tmpDir);

    expect(zodRoute).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/users/list" }),
    );
  });

  it("skips modules with no default export", async () => {
    const routeFile = path.join(tmpDir, "bad", "routes.ts");
    fs.mkdirSync(path.dirname(routeFile), { recursive: true });
    fs.writeFileSync(routeFile, `export const notDefault = () => {};`);

    vi.mocked(fg).mockResolvedValue([routeFile]);

    await autoloadRoutes(app, tmpDir);

    expect(zodRoute).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });
});
