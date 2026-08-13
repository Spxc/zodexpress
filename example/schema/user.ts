import { z } from "zod";

export const user = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const userUpdateRequest = user.pick({
  name: true,
});
export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type User = z.infer<typeof user>;
export type UserUpdateRequest = z.infer<typeof userUpdateRequest>;
export type UserUpdateResponse = z.infer<typeof userResponseSchema>;
