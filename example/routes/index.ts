import { Role, type RoutePlugin } from "@plugin";

const routes: RoutePlugin = async (app) => {
  app.zodRoute({
    method: "GET",
    url: "/",
    roles: [Role.PUBLIC],
    handler: (_, res) => res.send(200),
  });
};

export default routes;
