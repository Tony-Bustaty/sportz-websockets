import { z } from 'zod';

/**
 * Validates query parameters for listing commentaries.
 * Uses z.coerce to automatically convert string query params (from URLs) to numbers.
 */
export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().positive().max(100).optional(),
});

/**
 * Validates the request body for creating a new commentary event.
 */
export const createCommentarySchema = z.object({
  minutes: z.number().int().nonnegative(),
  sequence: z.number().int().positive(), // Sequence typically starts at 1
  period: z.string().min(1),
  eventType: z.string().min(1),
  actor: z.string().min(1),
  team: z.string().min(1),
  message: z.string().min(1, 'Message is required and cannot be empty'),
  metadata: z.record(z.string(), z.unknown()).optional(), // Key-value pairs with unknown values
  tags: z.array(z.string()).optional(),
});

// ==========================================
// Inferred Types for Controllers & Services
// ==========================================

export type ListCommentaryQuery = z.infer<typeof listCommentaryQuerySchema>;
export type CreateCommentaryPayload = z.infer<typeof createCommentarySchema>;