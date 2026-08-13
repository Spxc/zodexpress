/**
 * This file contains type definitions and interfaces for ZodExpress.
 * It defines types for roles, HTTP methods, route schemas, request and response types,
 * and route handlers. These types are used to provide type safety and validation for
 * incoming requests and outgoing responses.
 */
import type { Express, Request, Response, NextFunction } from "express";
import type { z } from "zod";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export { HTTP_METHODS };

export enum Role {
  PUBLIC = "PUBLIC",
  AUTHENTICATED = "AUTHENTICATED",
}

export type HttpMethod = (typeof HTTP_METHODS)[number];
export type MethodString = HttpMethod | `${HttpMethod}/${string}`;

/**
 * ZodAppUser is an interface that defines the shape of an authenticated user object.
 * It includes an id property of type string, which represents the unique identifier of the user.
 * This interface can be extended by the consuming application to include additional properties for the authenticated user.
 *
 * You can augment this interface in your application to include more user properties, for example:
 *
 * declare module "@zodexpress" {
 *   interface ZodAppUser extends User {}
 * }
 *
 * This allows ZodRouteAuthenticated to automatically recognize the application's User type without requiring it to be specified on every handler.
 */
export interface ZodAppUser {
  id: string;
}

/**
 * VerifyToken is a type that defines a function for verifying a token and returning the authenticated user.
 * @template TUser - The type of the authenticated user, extending ZodAppUser.
 */
export type VerifyToken<TUser extends object = ZodAppUser> = (
  token: string,
) => Promise<TUser>;

/**
 * ZodAppOptions is an interface that defines the options for creating a ZodApp.
 * It includes a verifyToken function that takes a token string and returns a Promise of the authenticated user (TUser).
 * The TUser type extends the ZodAppUser interface, allowing for customization of the authenticated user type.
 */
export interface ZodAppOptions<TUser extends object = ZodAppUser> {
  verifyToken: VerifyToken<TUser> | undefined;
  routes?: string;
}

/**
 * RouteSchema is an interface that defines the shape of a route schema.
 * It includes optional properties for querystring, params, body, and response,
 * which can be defined using Zod schemas. This allows for type-safe validation
 * of incoming requests and outgoing responses in route handlers.
 */
export interface RouteSchema {
  querystring?: z.ZodType<any>;
  params?: z.ZodType<any>;
  body?: z.ZodType<any>;
  response?: Record<number, z.ZodType<any>>;
}

/**
 * RouteGenericInterface is an interface that defines the generic types for querystring, params, body, and reply in a route.
 * It allows for type safety when defining route handlers and their expected request and response types.
 */
export interface RouteGenericInterface {
  Querystring?: unknown;
  Params?: unknown;
  Body?: unknown;
  Reply?: unknown;
}

/**
 * OrDefault is a utility type that checks if a type V is undefined.
 * If V is undefined, it returns the default type D; otherwise, it returns V.
 * This is useful for providing default types for optional properties in route handlers.
 * @template V - The type to check for undefined.
 * @template D - The default type to use if V is undefined.
 */
type OrDefault<V, D> = [Exclude<V, undefined>] extends [never]
  ? D
  : Exclude<V, undefined>;

/**
 * AuthenticatedLocals is an interface that defines the shape of the locals object for authenticated requests.
 * It includes a user property of type TUser, which extends the ZodAppUser interface.
 * This allows for type safety when accessing the authenticated user's information in route handlers.
 * @template TUser - The type of the authenticated user, extending ZodAppUser.
 */
export interface AuthenticatedLocals<TUser extends object = ZodAppUser> {
  user: TUser;
}

/**
 * TypedRequest is a type that extends the Express Request type and adds type safety for query, params, and body based on the provided RouteGenericInterface.
 * It also allows for additional local properties to be added to the request object.
 * @template T - The RouteGenericInterface that defines the types for query, params, body, and reply.
 * @template Locals - An object type that defines additional local properties to be added to the request object.
 */
export type TypedRequest<
  T extends RouteGenericInterface = RouteGenericInterface,
  Locals extends object = Record<string, never>,
> = Omit<Request, "query" | "params" | "body"> &
  Locals & {
    query: OrDefault<T["Querystring"], Record<string, unknown>>;
    params: OrDefault<T["Params"], Record<string, string>>;
    body: OrDefault<T["Body"], unknown>;
  };

export type TypedResponse<
  T extends RouteGenericInterface = RouteGenericInterface,
> = Omit<Response, "status"> &
  (undefined extends T["Reply"]
    ? {
        status(code: number): {
          send(body?: unknown): TypedResponse<T>;
          json(body?: unknown): TypedResponse<T>;
        };
      }
    : {
        status(code: number): {
          send(body: T["Reply"]): TypedResponse<T>;
          json(body: T["Reply"]): TypedResponse<T>;
        };
      });

/**
 * HandlerReturn is a type that defines the possible return types of a route handler function.
 * It can be a TypedResponse<T>, a Response, void, or the inferred Reply type from the RouteGenericInterface.
 */
type HandlerReturn<T extends RouteGenericInterface> =
  | TypedResponse<T>
  | Response
  | void
  | (undefined extends T["Reply"] ? unknown : T["Reply"]);

/**
 * ZodRoutePublic is a type that defines the shape of a public route handler function.
 * It takes a request of type TypedRequest<T>, a response of type TypedResponse<T>,
 * and a next function of type NextFunction. The handler can return a Promise of HandlerReturn<T>
 * or a direct HandlerReturn<T> value.
 */
export type ZodRoutePublic<
  T extends RouteGenericInterface = RouteGenericInterface,
> = (
  req: TypedRequest<T>,
  res: TypedResponse<T>,
  next: NextFunction,
) => Promise<HandlerReturn<T>> | HandlerReturn<T>;

export type ZodRouteAuthenticated<
  T extends RouteGenericInterface = RouteGenericInterface,
> = (
  req: TypedRequest<T, AuthenticatedLocals>,
  res: TypedResponse<T>,
  next: NextFunction,
) => Promise<HandlerReturn<T>> | HandlerReturn<T>;

/**
 * InferResponse is a utility type that infers the response type from a given record of Zod schemas.
 * It takes a record of Zod schemas (R) and returns the inferred type of the response based on the keys of the record.
 */
type InferResponse<R extends Record<number, z.ZodType<any>>> = z.infer<
  R[keyof R]
>;

/**
 * InferGeneric is a utility type that infers the generic types for querystring, params, body, and response from a given route schema (S).
 * It checks if each property exists in the schema and infers the corresponding type using Zod's infer method.
 */
type InferGeneric<S extends RouteSchema> = ("querystring" extends keyof S
  ? S["querystring"] extends z.ZodType<any>
    ? {
        Querystring: z.infer<S["querystring"]>;
      }
    : {}
  : {}) &
  ("params" extends keyof S
    ? S["params"] extends z.ZodType<any>
      ? {
          Params: z.infer<S["params"]>;
        }
      : {}
    : {}) &
  ("body" extends keyof S
    ? S["body"] extends z.ZodType<any>
      ? {
          Body: z.infer<S["body"]>;
        }
      : {}
    : {}) &
  ("response" extends keyof S
    ? S["response"] extends Record<number, z.ZodType<any>>
      ? {
          Reply: InferResponse<S["response"]>;
        }
      : {}
    : {});

/**
 * HandlerFor is a conditional type that determines the appropriate handler type based on the provided route schema and roles.
 * If the roles include Role.AUTHENTICATED, it returns ZodRouteAuthenticated; otherwise, it returns ZodRoutePublic.
 */
type HandlerFor<S extends RouteSchema, R extends readonly Role[]> =
  Extract<R[number], Role.AUTHENTICATED> extends never
    ? ZodRoutePublic<InferGeneric<S>>
    : ZodRouteAuthenticated<InferGeneric<S>>;

/**
 * RouteOptions defines the options for a route, including the HTTP method, URL, roles, schema, and handler.
 * The schema is optional and can be used to define request and response validation using Zod schemas.
 */

export interface RouteOptions<
  S extends RouteSchema,
  R extends readonly Role[],
> {
  method: MethodString;
  url: string;
  roles: R;
  schema?: S;
  handler: HandlerFor<S, R>;
}

/**
 * ZodApp extends Express and adds the zodRoute method for defining routes with Zod validation.
 * This allows you to define routes with automatic request and response validation using Zod schemas.
 */
export interface ZodApp extends Express {
  zodRoute<
    S extends RouteSchema = RouteSchema,
    R extends readonly Role[] = Role[],
  >(
    options: RouteOptions<S, R>,
  ): void;
}

export type RoutePlugin = (app: ZodApp) => Promise<void> | void;
