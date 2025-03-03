import { Hono } from "@hono/hono";
import { isHex } from "viem";
import { logger } from "../config/logger.ts";
import {
  enqueueShamanJob,
  executeShaman,
  startShamanJob,
} from "../services/shamans.ts";
import { ShamanRequest } from "../types/common.ts";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body: ShamanRequest = await c.req.json();

    if (!body.shamanId || !isHex(body.shamanId)) {
      logger.warn("Missing shamanId in request");
      return c.json({ error: "Missing shamanId in request body" }, 400);
    }

    // enqueue shaman job
    await enqueueShamanJob(body.shamanId, 1n);
    // start shaman job
    await startShamanJob(body.shamanId);

    // execute shaman
    const executionResult = await executeShaman(body.shamanId);

    return c.json(executionResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing request: ${message}`);

    return c.json({ error: message }, 500);
  }
});

export default app;
