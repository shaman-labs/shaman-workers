import { Hono } from "@hono/hono";
import redis from "../services/upstash.ts";
import { logger } from "../config/logger.ts";
import { User } from "../middlewares/privyMiddleware.ts";

const app = new Hono();

interface SecretRequest {
  key: string;
  value: string;
}

app.post("/", async (c) => {
  try {
    const { key, value }: SecretRequest = await c.req.json();
    const variables = c.var as { user: User };
    const user = variables.user;

    const multi = redis.multi();
    multi.set(`secret:${user.wallet.address.toLowerCase()}:${key}`, value);
    multi.sadd(`secret:${user.wallet.address.toLowerCase()}:keys`, key);
    await multi.exec();

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing POST request: ${message}`);
    return c.json({ error: message }, 500);
  }
});

app.get("/", async (c) => {
  try {
    const variables = c.var as { user: User };
    const user = variables.user;

    const keys = await redis.smembers(
      `secret:${user.wallet.address.toLowerCase()}:keys`
    );

    return c.json({ keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing GET request: ${message}`);
    return c.json({ error: message }, 500);
  }
});

app.delete("/", async (c) => {
  try {
    const variables = c.var as { user: User };
    const user = variables.user;

    const { key }: SecretRequest = await c.req.json();
    const multi = redis.multi();
    multi.del(`secret:${user.wallet.address.toLowerCase()}:${key}`);
    multi.srem(`secret:${user.wallet.address.toLowerCase()}:keys`, key);
    await multi.exec();

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing DELETE request: ${message}`);
    return c.json({ error: message }, 500);
  }
});

export default app;
