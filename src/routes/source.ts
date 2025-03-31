import { Hono } from "@hono/hono";
import { logger } from "../config/logger.ts";
import { publishSourceMessage } from "../queues/source.ts";
import { Hex } from "viem";
import { User } from "../middlewares/privyMiddleware.ts";

const app = new Hono();

app.post("/:sourceId", async (c) => {
  try {
    const variables = c.var as { user: User };
    const user = variables.user;

    const body: Record<string, unknown> = await c.req.json();
    const result = await publishSourceMessage(
      c.req.param("sourceId") as Hex,
      body
    );

    return c.json({ result }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing request: ${message}`);

    return c.json({ error: message }, 500);
  }
});

export default app;
