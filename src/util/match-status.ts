import { matches } from "./../db/schema.ts";
import { MATCH_STATUS } from "../validation/matches.ts";
import z from "zod";
type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS];
export function getMatchStatus(
  startTime: string,
  endTime: string,
  now = new Date(),
) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (now < start) {
    return MATCH_STATUS.SCHEDULED;
  }

  if (now >= end) {
    return MATCH_STATUS.FINISHED;
  }

  return MATCH_STATUS.LIVE;
}

export async function syncMatchStatus(
  match: typeof matches.$inferSelect,
  updateStatus: (status: MatchStatus) => z.infer<typeof matches>,
) {
  const nextStatus = getMatchStatus(
    match.startTime.toString(),
    match.endTime?.toString() as string,
  );
  if (!nextStatus) {
    return match.status;
  }
  if (match.status !== nextStatus) {
    await updateStatus(nextStatus);
    match.status = nextStatus;
  }
  return match.status;
}
