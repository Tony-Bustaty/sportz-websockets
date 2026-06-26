import { Router } from "express";
import type { Request, Response } from "express";
import { matchIdParamSchema } from "../validation/matches.ts";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.ts";
import { db } from "../db/db.ts";
import { commentary } from "../db/schema.ts";
import { ZodError } from "zod";
import { desc, eq } from "drizzle-orm";
export const commentaryRouter = Router({ mergeParams: true });
const MAX_LIMIT = 100;
commentaryRouter.get("/", async (req, res, next) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res
      .status(400)
      .json({
        message: "Invalid match ID ",
        details: paramsResult.error.issues,
      });
  }
  const queryResult = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res
      .status(400)
      .json({
        message: "Invalid Query parameters ",
        details: queryResult.error.issues,
      });
  }
  try {
    const { id: matchId } = paramsResult.data;
    const { limit = 10 } = queryResult.data;
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const matchCommentary = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(safeLimit);


    res.status(200).json({
      success: true,
      data: matchCommentary,
      meta: {
        count: matchCommentary.length,
        limit: safeLimit,
      },
    });
  } catch (error) {

    res.status(500).json({ error: "Failed to fetch commentary" });
  }
});

commentaryRouter.post("/", async (req: Request, res: Response) => {
  try {
    const parsedParams = matchIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
      return res
        .status(400)
        .json({ error: "Invalid Match", details: parsedParams.error.issues });
    }
    const parsedBody = createCommentarySchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res
        .status(400)
        .json({
          error: "Invalid commentary payload",
          details: parsedBody.error.issues,
        });
    }
    const { minutes, ...rest } = parsedBody.data;
    const [result] = await db
      .insert(commentary)
      .values({
        ...rest,
        minute: minutes,
        matchId: parsedParams.data.id,
      })
      .returning();
      if(res.app.locals.broadcastCommentary){
        res.app.locals.broadcastCommentary(result.matchId,result)
      }
    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    console.error("Error creating commentary:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while creating the commentary.",
    });
  }
});
