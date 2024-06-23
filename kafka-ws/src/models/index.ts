import { z } from "zod"

export const authSchema = z.object({
  userId: z.string(),
  isParent: z.boolean()
})

export const coreSchema = z.object({
  auth: authSchema,
  data: z.unknown()
})

export type Auth = z.infer<typeof authSchema>

export type Core = z.infer<typeof coreSchema>