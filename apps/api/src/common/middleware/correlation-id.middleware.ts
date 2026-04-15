import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

const OUT_HEADER = "X-Request-Id";

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming =
    req.get("X-Request-Id")?.trim() || req.get("X-Correlation-Id")?.trim();
  const id = incoming && incoming.length > 0 ? incoming : randomUUID();
  req.correlationId = id;
  res.setHeader(OUT_HEADER, id);
  next();
}
