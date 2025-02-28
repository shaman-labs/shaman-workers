import { Hono } from "@hono/hono";
import { logger } from "../config/logger.ts";
import { enqueueFromSource } from "../queues/source.ts";

export interface SourceRequest {
  source: string;
  context: Record<string, unknown>;
}

const app = new Hono();

app.post("/:source", async (c) => {
  try {
    const body: Record<string, unknown> = await c.req.json();
    const result = await enqueueFromSource(c.req.param("source"), body);

    return c.json({ result }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing request: ${message}`);

    return c.json({ error: message }, 500);
  }
});

export default app;
