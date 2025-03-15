import { Hono } from "@hono/hono";
import { isHex } from "viem";
import { logger } from "../config/logger.ts";
import { ShamanRequest } from "../types/common.ts";
import { Source, SourceIds } from "../types/source.ts";
import { enqueueFromSource } from "../queues/source.ts";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body: ShamanRequest = await c.req.json();

    if (!body.shamanId || !isHex(body.shamanId)) {
      logger.warn("Missing shamanId in request");
      return c.json({ error: "Missing shamanId in request body" }, 400);
    }

    const result = await enqueueFromSource(SourceIds[Source.MANUAL], {
      shamanId: body.shamanId,
    });

    return c.json(result, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing request: ${message}`);

    return c.json({ error: message }, 500);
  }
});

export default app;
