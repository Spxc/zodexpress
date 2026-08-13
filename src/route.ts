import type { Express, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

import {
  HTTP_METHODS,
  Role,
  type RouteSchema,
  type VerifyToken,
  type ZodApp,
  type ZodAppOptions,
} from "./types";
import { autoloadRoutes } from "./autoload";

/**
 * Use this function to parse a string containing HTTP methods separated by "/".
 * @param methodString A string containing HTTP methods separated by "/"
 * @returns An array of lowercase HTTP methods
 */
function parseMethods(
  methodString: string,
): Lowercase<(typeof HTTP_METHODS)[number]>[] {
  const methods = methodString.split("/").map((m) => m.trim().toUpperCase());

  for (const m of methods) {
    if (!HTTP_METHODS.includes(m as (typeof HTTP_METHODS)[number])) {
      throw new Error(
        `Invalid HTTP method "${m}" in route method string "${methodString}"`,
      );
    }
  }

  return methods.map((m) => m.toLowerCase()) as Lowercase<
    (typeof HTTP_METHODS)[number]
  >[];
}

/**
 * Use this function to create a middleware that checks the roles required to access a route.
 * @param roles An array of roles required to access the route
 * @param verifyToken
 * @returns The middleware function that checks the roles and verifies the token if necessary
 */
function checkRoles<TUser extends object>(
  roles: readonly Role[],
  verifyToken: VerifyToken<TUser>,
): RequestHandler {
  return async (req, res, next) => {
    if (roles.includes(Role.PUBLIC)) {
      return next();
    }

    if (roles.includes(Role.AUTHENTICATED)) {
      const authHeader = req.headers.authorization;

      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;

      if (!token) {
        return void res.status(401).json({ error: "Unauthorized" });
      }

      try {
        const user = await verifyToken(token);

        (
          req as typeof req & {
            user: TUser;
          }
        ).user = user;

        return next();
      } catch {
        return void res.status(401).json({ error: "Unauthorized" });
      }
    }

    return void res.status(403).json({ error: "Forbidden" });
  };
}

/**
 * Use this function to create a middleware that validates the request against the provided schema.
 * @param schema The schema to validate the request against
 * @returns A middleware function that validates the request
 */
function validateRequest(schema?: RouteSchema): RequestHandler {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    try {
      if (schema.querystring) {
        Object.defineProperty(req, "query", {
          value: schema.querystring.parse(req.query),
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      if (schema.params) {
        req.params = schema.params.parse(req.params) as typeof req.params;
      }

      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return void res.status(400).json({
          error: "ValidationError",
          issues: err.issues,
        });
      }

      return next(err);
    }
  };
}

/**
 * Use this function to create a middleware that validates the response against the provided schema.
 * If the response does not match the schema, it will log an error and throw an exception in non-production environments.
 * @param schema The schema to validate the response against
 * @returns A middleware function that validates the response
 */
function validateResponse(schema?: RouteSchema): RequestHandler {
  return (req, res, next) => {
    const responseSchemas = schema?.response;

    if (!responseSchemas) {
      return next();
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let insideJson = false;

    const validate = (body: unknown) => {
      const schemaForStatus = responseSchemas[res.statusCode];

      if (!schemaForStatus) {
        return body;
      }

      const result = schemaForStatus.safeParse(body);

      if (!result.success) {
        const message =
          `Response validation failed for ` +
          `${req.method} ${req.originalUrl} ` +
          `[${res.statusCode}]: ` +
          result.error.message;

        if (process.env.NODE_ENV !== "production") {
          throw new Error(message);
        }

        console.error("Response validation failed:", result.error.issues);

        return body;
      }

      return result.data;
    };

    res.json = ((body?: unknown) => {
      try {
        insideJson = true;

        return originalJson(validate(body));
      } finally {
        insideJson = false;
      }
    }) as typeof res.json;

    res.send = ((body?: unknown) => {
      if (insideJson) {
        return originalSend(body);
      }

      return originalSend(validate(body));
    }) as typeof res.send;

    next();
  };
}

/**
 * Use this function to wrap a request handler with error handling and automatic response sending.
 * @param handler The request handler to wrap
 * @returns A wrapped request handler that handles errors and sends the response
 */
function wrapHandler(handler: RequestHandler): RequestHandler {
  return async (req: Request, res: Response, next) => {
    try {
      const result = await handler(req, res, next);

      if (res.headersSent) {
        return;
      }

      if (result === undefined) {
        return;
      }

      if (result === res) {
        return;
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Use this function to create a ZodExpressApp from an existing express app.
 * This will extend the express app with the `zodRoute` method, which allows you to define routes with Zod validation and role-based access control.
 * @param app The express app to extend
 * @param options
 * @returns
 */
export function createZodExpressApp<TUser extends object>(
  app: Express,
  options?: ZodAppOptions<TUser>,
): ZodApp {
  const zodApp = app as ZodApp;

  zodApp.zodRoute = (routeOptions) => {
    const { method, url, roles, schema, handler } = routeOptions;

    const methods = parseMethods(method);

    const chain: RequestHandler[] = [
      ...(options?.verifyToken
        ? [checkRoles(roles, options?.verifyToken)]
        : []),
      validateRequest(schema),
      validateResponse(schema),
      wrapHandler(handler as unknown as RequestHandler),
    ];

    for (const m of methods) {
      app[m](url, ...chain);
    }
  };

  return zodApp;
}

/**
 * Use this function to create a ZodExpressApp and autoload routes from a directory.
 * @param app The express app to extend
 * @param options ZodAppOptions
 * @returns A promise that resolves to a ZodApp
 */
export async function setupZodExpressApp<TUser extends object>(
  app: Express,
  options?: ZodAppOptions<TUser>,
): Promise<ZodApp> {
  const zodApp = createZodExpressApp(app, options);

  if (options?.routes) {
    await autoloadRoutes(zodApp, options.routes);
  }

  return zodApp;
}

export const _private =
  process.env.NODE_ENV === "test"
    ? {
        parseMethods,
        checkRoles,
        validateRequest,
        validateResponse,
        wrapHandler,
      }
    : {
        parseMethods: () => {
          throw new Error("parseMethods is not available");
        },
        checkRoles: () => {
          throw new Error("checkRoles is not available");
        },
        validateRequest: () => {
          throw new Error("validateRequest is not available");
        },
        validateResponse: () => {
          throw new Error("validateResponse is not available");
        },
        wrapHandler: () => {
          throw new Error("wrapHandler is not available");
        },
      };
