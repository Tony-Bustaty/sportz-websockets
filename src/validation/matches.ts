// src/validation/matches.ts
import { z } from 'zod';

/**
 * Standardized match status constants.
 * Keys are uppercase for code readability, values match DB enum format.
 */
export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
}  as const;

/**
 * Query schema for listing matches.
 * Validates optional pagination limit with strict type coercion.
 */
export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * Route parameter schema for match-specific endpoints.
 */
export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Schema for creating a new match record.
 * Includes ISO date validation and chronological ordering enforcement.
 */
export const createMatchSchema = z.object({
  sport: z.string().min(1, 'Sport is required'),
  homeTeam: z.string().min(1, 'Home team is required'),
  awayTeam: z.string().min(1, 'Away team is required'),
  startTime: z.string(),
  endTime: z.string(),
  homeScore: z.coerce.number().int().min(0).optional(),
  awayScore: z.coerce.number().int().min(0).optional(),
})
.refine((data) => {
  const isValidISO = (dateStr:string) => !isNaN(Date.parse(dateStr));
  return isValidISO(data.startTime) && isValidISO(data.endTime);
}, 'Both startTime and endTime must be valid ISO date strings')
.superRefine((data, ctx) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (end <= start) {
    ctx.addIssue({
      code: 'custom',
      message: 'endTime must be chronologically after startTime',
      path: ['endTime'],
    });
  }
});

/**
 * Schema for updating match scores in real-time.
 * Requires both scores to prevent partial updates that could break UI state.
 */
export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});