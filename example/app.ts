import express from "express";
import path from "node:path";
import { verifyToken } from "@example/services";
import { User } from "@example/schema";
import { setupZodExpressApp } from "../src/route";

const PORT = process.env.PORT || 3003;

/**
 * Setup the express app and load routes from the routes directory.
 */
const baseApp = express();
baseApp.use(express.json());

async function main() {
  /**
   * Create a ZodExpressApp with the base express app and the verifyToken function.
   * If you dont want to use authentication, you can pass undefined for the verifyToken function.
   * This will allow you to use the ZodRouteAuthenticated type without requiring a verifyToken function.
   * const app = createZodExpressApp<User>(baseApp);
   */
  const app = await setupZodExpressApp<User>(baseApp, {
    verifyToken,
    routes: path.join(__dirname, "routes"),
  });
  /**
   * Autoload routes from the routes directory.
   * The autoloadRoutes function will recursively load all routes from the specified directory and register them with the express app.
   * The routes can be defined in separate files and will be automatically loaded and registered with the app.
   *
   * Setting `routes` in the `setupZodExpressApp` options is equivalent to calling `autoloadRoutes` after creating the app.
   * await autoloadRoutes(app, path.join(__dirname, "routes"));
   */
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

main().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
