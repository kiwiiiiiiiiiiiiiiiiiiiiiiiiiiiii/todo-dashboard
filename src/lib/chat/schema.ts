import { z } from "zod"

// How much history reaches the model. Unbounded history inflates token cost
// and eventually trips provider rate limits.
export const MAX_CHAT_TURNS = 12

// Hard limits on what a client may send, enforced before any DB work.
export const MAX_TURNS_PER_REQUEST = 50
export const MAX_MESSAGE_CHARS = 4000

export const chatMessageSchema = z.object({
  // "system" is deliberately absent: the persona is server-owned and a client
  // must never be able to inject or replace it.
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
})

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(MAX_TURNS_PER_REQUEST),
  timezone: z.string().max(64).optional(),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
