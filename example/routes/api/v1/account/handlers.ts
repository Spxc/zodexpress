import type { ZodRouteAuthenticated } from "@plugin";
import { UserUpdateRequest, UserUpdateResponse } from "@example/schema";

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
  return { id: requesterId, name: req.body.name };
};
