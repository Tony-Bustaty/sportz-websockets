import type { Request, Response } from "express";
import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.ts";
import { db } from "../db/db.ts";
import { matches } from "../db/schema.ts";
import { getMatchStatus } from "../util/match-status.ts";
import { desc } from "drizzle-orm";
export const matchesRouter = Router();
matchesRouter.get("/", async (req: Request, res: Response) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);
  const MAX_LIMIT = 100;
  if (!parsed.success)
    return res.status(400).json({
      error: "Invalid Query",
      details: JSON.stringify(parsed.error.issues),
    });
  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);
  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to list the matches",
      details: {
        message: (error as Error)?.message ?? "Unexpected error",
      },
    });
  }
});
matchesRouter.post("/", async (req: Request, res: Response) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.issues,
    });
  const {
    data: { startTime, homeScore, endTime, awayScore },
  } = parsed;
  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime) ?? "scheduled",
      })
      .returning();
      if(res.app.locals.broadcastMatchCreated){
        res.app.locals.broadcastMatchCreated(event)
      }
    res.status(201).json({ data: event });
  } catch (error) {
    return res.status(500).json({
      error: "something went wrong while creating a match",
        details: {
        message: (error as Error)?.message ?? "Unexpected error",
      },
    });
  }
});
