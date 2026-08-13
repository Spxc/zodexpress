import type { ZodRoutePublic } from "@plugin";
import { HealthQueryString, HealthResponse } from "@example/schema";

export const handler: ZodRoutePublic<{
  Querystring: HealthQueryString;
  Reply: HealthResponse;
}> = async () => {
  return {
    status: "ok",
    uptime: 123123,
  };
};
