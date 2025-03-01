import { Hex, isHex } from "viem";
import { Hono } from "@hono/hono";
import { logger } from "../config/logger.ts";
import { executeShaman } from "../services/shamans.ts";

export interface ShamanRequest {
  shamanId: Hex;
}

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body: ShamanRequest = await c.req.json();

    if (!body.shamanId || !isHex(body.shamanId)) {
      logger.warn("Missing shamanId in request");
      return c.json({ error: "Missing shamanId in request body" }, 400);
    }

    const executionResult = await executeShaman(body.shamanId);

    return c.json(executionResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing request: ${message}`);

    return c.json({ error: message }, 500);
  }
});

export default app;
