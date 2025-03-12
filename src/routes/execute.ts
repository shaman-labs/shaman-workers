import { Hono } from "@hono/hono";
import { isHex } from "viem";
import { logger } from "../config/logger.ts";
import { getShaman, processShamanJob } from "../services/shamans.ts";
import { ShamanRequest } from "../types/common.ts";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body: ShamanRequest = await c.req.json();

    if (!body.shamanId || !isHex(body.shamanId)) {
      logger.warn("Missing shamanId in request");
      return c.json({ error: "Missing shamanId in request body" }, 400);
    }

    const shaman = await getShaman(body.shamanId);

    const executionResult = await processShamanJob(shaman);

    return c.json(executionResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing request: ${message}`);

    return c.json({ error: message }, 500);
  }
});

export default app;
