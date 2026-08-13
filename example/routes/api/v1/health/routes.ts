import { Role, type RoutePlugin } from "@plugin";
import { healthQueryString, healthResponseSchema } from "@example/schema";
import { handler } from "./handlers";

const routes: RoutePlugin = async (app) => {
  app.zodRoute({
    method: "GET",
    url: "/",
    roles: [Role.PUBLIC],
    schema: {
      querystring: healthQueryString,
      response: { 200: healthResponseSchema },
    },
    handler,
  });
};

export default routes;
