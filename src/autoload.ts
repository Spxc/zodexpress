import { RoutePlugin, ZodApp } from "./types";
import fg from "fast-glob";
import path from "node:path";

function joinUrl(prefix: string, url: string): string {
  const result = `${prefix}/${url}`.replace(/\/+/g, "/");

  if (result.length > 1 && result.endsWith("/")) {
    return result.slice(0, -1);
  }

  return result;
}

function createScopedApp(app: ZodApp, prefix: string): ZodApp {
  return new Proxy(app, {
    get(target, property, receiver) {
      if (property !== "zodRoute") {
        return Reflect.get(target, property, receiver);
      }

      return (options: Parameters<ZodApp["zodRoute"]>[0]) => {
        return target.zodRoute({
          ...options,
          url: joinUrl(prefix, options.url),
        });
      };
    },
  });
}

export async function autoloadRoutes(app: ZodApp, dir: string) {
  const files = await fg("**/routes.{ts,js}", {
    cwd: dir,
    absolute: true,
  });

  for (const file of files) {
    const relativeDir = path.relative(dir, path.dirname(file));

    const prefix =
      relativeDir === "" ? "" : `/${relativeDir.split(path.sep).join("/")}`;

    const mod = await import(file);
    const plugin: RoutePlugin | undefined = mod.default;

    if (typeof plugin !== "function") {
      console.warn(`No default export found in ${file}, skipping`);
      continue;
    }

    const scopedApp = createScopedApp(app, prefix);
    console.log(`Loading routes from ${file} with prefix "${prefix}"`);
    await plugin(scopedApp);
  }
}
