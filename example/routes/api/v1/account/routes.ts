import { Role, type RoutePlugin } from "@plugin";
import { handler, handlerUpdate } from "./handlers";
import { userResponseSchema, userUpdateRequest } from "@example/schema";

const routes: RoutePlugin = async (app) => {
  app.zodRoute({
    method: "GET",
    url: "/",
    roles: [Role.AUTHENTICATED],
    schema: {
      response: { 200: userResponseSchema },
    },
    handler,
  });

  app.zodRoute({
    method: "PATCH",
    url: "/",
    roles: [Role.AUTHENTICATED],
    schema: {
      body: userUpdateRequest,
      response: { 200: userResponseSchema },
    },
    handler: handlerUpdate,
  });
};

export default routes;
