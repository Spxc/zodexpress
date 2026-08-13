import { z } from "zod";

export const healthQueryString = z.object({
  verbose: z.coerce.boolean().optional(),
});

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  uptime: z.number(),
});

export type HealthQueryString = z.infer<typeof healthQueryString>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
