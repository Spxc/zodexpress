# @spxc/zodexpress

Type-safe, schema-driven routing for Express.

`@spxc/zodexpress` provides typed route definitions on top of Express using Zod schemas. It handles route registration, request/response typing, authentication, role-based access, and recursive route loading.

The package is intentionally thin. Express remains the underlying HTTP framework, while Zod schemas define the contract of each route.

| Express | Zod |
|-------- | --- |
| `5.2.x` | `4.4.x` |

## Installation

```bash
npm install @spxc/zodexpress
```

```bash
pnpm add @spxc/zodexpress
```

```bash
yarn add @spxc/zodexpress
```

## Setup
You can find a fully working express server in the [example folder](/example/)
Start with a normal Express application and pass it to `setupZodExpressApp`.

```ts
import express from "express";
import path from "node:path";
import { setupZodExpressApp } from "@spxc/zodexpress";
import { verifyToken } from "@example/services";
import { User } from "@example/schema";

const PORT = process.env.PORT || 3003;

const baseApp = express();

baseApp.use(express.json());

async function main() {
  const app = await setupZodExpressApp<User>(baseApp, {
    verifyToken,
    routes: path.join(__dirname, "routes"),
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
```

The `routes` option points at the root of the route tree.

For example:

```text
routes/
└── api/
    └── v1/
        └── health/
            ├── routes.ts
            └── handlers.ts
```

The directory structure determines how routes are organized, while `routes.ts` defines the HTTP contract and `handlers.ts` contains the implementation.

## Route Structure

A route module consists of two files:

```text
routes/
└── api/
    └── v1/
        └── users/
            ├── routes.ts
            └── handlers.ts
```

### `routes.ts`

`routes.ts` defines the routes exposed by the module.

It is responsible for:

* HTTP method and URL
* authentication requirements
* roles
* request schemas
* response schemas
* the handler associated with each route

For example:

```ts
import { Role, type RoutePlugin } from "@spxc/zodexpress";
import { handler, handlerUpdate } from "./handlers";
import {
  userResponseSchema,
  userUpdateRequest,
} from "@example/schema";

const routes: RoutePlugin = async (app) => {
  app.zodRoute({
    method: "GET",
    url: "/",
    roles: [Role.AUTHENTICATED],
    schema: {
      response: {
        200: userResponseSchema,
      },
    },
    handler,
  });

  app.zodRoute({
    method: "PATCH",
    url: "/",
    roles: [Role.AUTHENTICATED],
    schema: {
      body: userUpdateRequest,
      response: {
        200: userResponseSchema,
      },
    },
    handler: handlerUpdate,
  });
};

export default routes;
```

The route definition is the API contract. Request and response schemas are declared here rather than inside the handler.

### `handlers.ts`

`handlers.ts` contains the implementation of the routes.

The handler type describes exactly which parts of the request are available and what the handler returns.

```ts
import type { ZodRouteAuthenticated } from "@spxc/zodexpress";
import type {
  UserUpdateRequest,
  UserUpdateResponse,
} from "@example/schema";

export const handler: ZodRouteAuthenticated<{
  Reply: UserUpdateResponse;
}> = async (req, res) => {
  return req.user;
};

export const handlerUpdate: ZodRouteAuthenticated<{
  Body: UserUpdateRequest;
  Reply: UserUpdateResponse;
}> = async (req, res) => {
  const requesterId = req.user.id;

  return {
    id: requesterId,
    name: req.body.name,
  };
};
```

This keeps the route declaration and implementation separate:

```text
routes.ts
  └── What does this endpoint accept and return?

handlers.ts
  └── How is the endpoint implemented?
```

The TypeScript types on the handler are derived from the same contract used by the route.

## Route URLs

The route tree is rooted at the directory passed to `setupZodExpressApp`.

For example:

```text
routes/
└── api/
    └── v1/
        └── health/
            ├── routes.ts
            └── handlers.ts
```

A route defined as:

```ts
app.zodRoute({
  method: "GET",
  url: "/",
  // ...
});
```

is registered at:

```text
/api/v1/health/
```

The directory hierarchy provides the base path for the route module. The `url` in `zodRoute` defines the path relative to that module.

This makes larger APIs straightforward to organize:

```text
routes/
├── api/
│   ├── v1/
│   │   ├── health/
│   │   │   ├── routes.ts
│   │   │   └── handlers.ts
│   │   ├── users/
│   │   │   ├── routes.ts
│   │   │   └── handlers.ts
│   │   └── posts/
│   │       ├── routes.ts
│   │       └── handlers.ts
│   └── v2/
│       └── users/
│           ├── routes.ts
│           └── handlers.ts
```

The filesystem becomes the API's route hierarchy.

## `zodRoute`

Routes are registered with `app.zodRoute()`.

A route definition specifies the HTTP method, relative URL, access requirements, schemas, and handler:

```ts
app.zodRoute({
  method: "PATCH",
  url: "/",
  roles: [Role.AUTHENTICATED],
  schema: {
    body: userUpdateRequest,
    response: {
      200: userResponseSchema,
    },
  },
  handler: handlerUpdate,
});
```

The schema describes the runtime contract of the endpoint.

For example:

```ts
schema: {
  body: userUpdateRequest,
  response: {
    200: userResponseSchema,
  },
}
```

This gives the route a validated request body and a defined response shape.

## Authentication

Authentication is configured when creating the application.

```ts
const app = await setupZodExpressApp<User>(baseApp, {
  verifyToken,
  routes: path.join(__dirname, "routes"),
});
```

The generic parameter specifies the authenticated user type:

```ts
setupZodExpressApp<User>(...)
```

Authenticated handlers use `ZodRouteAuthenticated`:

```ts
const handler: ZodRouteAuthenticated<{
  Reply: UserUpdateResponse;
}> = async (req, res) => {
  return req.user;
};
```

The authenticated user is therefore available as a typed property on the request:

```ts
req.user
```

If authentication is not required, `verifyToken` can be omitted:

```ts
const app = await setupZodExpressApp<User>(baseApp, {
  routes: path.join(__dirname, "routes"),
});
```

## Roles

Routes can declare the roles required to access them.

```ts
app.zodRoute({
  method: "GET",
  url: "/",
  roles: [Role.AUTHENTICATED],
  schema: {
    response: {
      200: userResponseSchema,
    },
  },
  handler,
});
```

Roles are part of the route definition rather than being checked manually inside every handler.

This keeps authorization requirements visible alongside the endpoint they protect.

## Request and Response Types

The handler type describes the data the handler receives and returns.

For a request body:

```ts
const handler: ZodRouteAuthenticated<{
  Body: UserUpdateRequest;
  Reply: UserUpdateResponse;
}> = async (req, res) => {
  const name = req.body.name;

  return {
    id: req.user.id,
    name,
  };
};
```

The route definition and handler therefore form a single type-safe contract:

```text
Zod schema
    ↓
route definition
    ↓
handler types
    ↓
handler implementation
```

If the schema or handler contract changes, TypeScript can surface inconsistencies during development instead of leaving them to runtime.

## Route Auto-Loading

Routes are loaded recursively from the directory supplied to `setupZodExpressApp`:

```ts
const app = await setupZodExpressApp<User>(baseApp, {
  verifyToken,
  routes: path.join(__dirname, "routes"),
});
```

Each route module exports its `RoutePlugin` as the default export:

```ts
const routes: RoutePlugin = async (app) => {
  // route definitions
};

export default routes;
```

This allows route modules to remain isolated while the application bootstrapping code only needs to know where the route tree lives.

## Manual Route Loading

Automatic loading is optional.

The route tree can also be loaded explicitly with `autoloadRoutes`:

```ts
import path from "node:path";
import {
  autoloadRoutes,
  setupZodExpressApp,
} from "@spxc/zodexpress";

const app = await setupZodExpressApp<User>(baseApp, {
  verifyToken,
});

await autoloadRoutes(app, path.join(__dirname, "routes"));
```

Passing `routes` to `setupZodExpressApp` is equivalent to performing this step during application setup.

## Recommended Project Structure

A larger application can be organized by API version and resource:

```text
routes/
├── api/
│   ├── v1/
│   │   ├── health/
│   │   │   ├── routes.ts
│   │   │   └── handlers.ts
│   │   ├── users/
│   │   │   ├── routes.ts
│   │   │   └── handlers.ts
│   │   └── posts/
│   │       ├── routes.ts
│   │       └── handlers.ts
│   └── v2/
│       └── users/
│           ├── routes.ts
│           └── handlers.ts
```

Schemas and application services can live outside the route tree:

```text
src/
├── schema/
├── services/
└── ...

routes/
└── api/
    └── v1/
        ├── health/
        │   ├── routes.ts
        │   └── handlers.ts
        └── users/
            ├── routes.ts
            └── handlers.ts
```

The route directory should contain the HTTP layer. Business logic can remain in services or other application modules rather than being coupled to the route loader.

## Complete Example

### `app.ts`

```ts
import express from "express";
import path from "node:path";
import { verifyToken } from "@example/services";
import { User } from "@example/schema";
import { setupZodExpressApp } from "@spxc/zodexpress";

const PORT = process.env.PORT || 3003;

const baseApp = express();

baseApp.use(express.json());

async function main() {
  const app = await setupZodExpressApp<User>(baseApp, {
    verifyToken,
    routes: path.join(__dirname, "routes"),
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
```

### `routes/api/v1/users/routes.ts`

```ts
import { Role, type RoutePlugin } from "@spxc/zodexpress";
import { handler, handlerUpdate } from "./handlers";
import {
  userResponseSchema,
  userUpdateRequest,
} from "@example/schema";

const routes: RoutePlugin = async (app) => {
  app.zodRoute({
    method: "GET",
    url: "/",
    roles: [Role.AUTHENTICATED],
    schema: {
      response: {
        200: userResponseSchema,
      },
    },
    handler,
  });

  app.zodRoute({
    method: "PATCH",
    url: "/",
    roles: [Role.AUTHENTICATED],
    schema: {
      body: userUpdateRequest,
      response: {
        200: userResponseSchema,
      },
    },
    handler: handlerUpdate,
  });
};

export default routes;
```

### `routes/api/v1/users/handlers.ts`

```ts
import type { ZodRouteAuthenticated } from "@spxc/zodexpress";
import type {
  UserUpdateRequest,
  UserUpdateResponse,
} from "@example/schema";

export const handler: ZodRouteAuthenticated<{
  Reply: UserUpdateResponse;
}> = async (req, res) => {
  return req.user;
};

export const handlerUpdate: ZodRouteAuthenticated<{
  Body: UserUpdateRequest;
  Reply: UserUpdateResponse;
}> = async (req, res) => {
  const requesterId = req.user.id;

  return {
    id: requesterId,
    name: req.body.name,
  };
};
```

With the route tree rooted at `routes/`, this module exposes its routes under:

```text
GET   /api/v1/users/
PATCH /api/v1/users/
```

## API

### `setupZodExpressApp`

Initializes a ZodExpress application from an existing Express application.

```ts
setupZodExpressApp<User>(app, {
  verifyToken,
  routes,
});
```

| Option        | Description                                          |
| ------------- | ---------------------------------------------------- |
| `verifyToken` | Optional token verification function.                |
| `routes`      | Optional root directory for automatic route loading. |

### `autoloadRoutes`

Recursively discovers route modules and registers them with the application.

```ts
await autoloadRoutes(app, routesDirectory);
```

### `zodRoute`

Registers a route with its request, response, authentication, and authorization contract.

```ts
app.zodRoute({
  method,
  url,
  roles,
  schema,
  handler,
});
```

### `RoutePlugin`

The type used by route modules.

```ts
const routes: RoutePlugin = async (app) => {
  // ...
};

export default routes;
```

### `ZodRouteAuthenticated`

The handler type for authenticated routes.

```ts
const handler: ZodRouteAuthenticated<{
  Body: RequestBody;
  Reply: ResponseBody;
}> = async (req, res) => {
  // ...
};
```

## Why This Structure?

The package separates the definition of an endpoint from its implementation.

`routes.ts` answers:

> What is this endpoint?

`handlers.ts` answers:

> What does this endpoint do?

Schemas define the boundary between the HTTP layer and the application:

```text
HTTP request
     │
     ▼
routes.ts
  ├── method
  ├── URL
  ├── authentication
  ├── roles
  └── Zod schemas
     │
     ▼
handlers.ts
     │
     ▼
HTTP response
```

This structure keeps route contracts declarative and makes the route tree itself a useful representation of the API surface.

## Development
_Requires: `pnpm > 10.x`_


Install dependencies:

```bash
pnpm install
```

Build the package:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

The repository includes an example application demonstrating application setup, authentication, schemas, route plugins, and recursive route loading.

## License

See [LICENSE](./LICENSE) for license information.
