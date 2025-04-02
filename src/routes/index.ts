import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { PORT } from "../config/env.ts";
import executeRoute from "./execute.ts";
import sourceRoute from "./source.ts";
import secretsRoute from "./secrets.ts";
import { logger } from "../config/logger.ts";
import privyMiddleware from "../middlewares/privyMiddleware.ts";

export const initializeRoutes = () => {
  logger.info("Initializing routes");
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(privyMiddleware);
  app.route("/execute", executeRoute);
  app.route("/source", sourceRoute);
  app.route("/secrets", secretsRoute);
  app.get("/health", (c) => c.json({ status: "ok" }));

  Deno.serve({ port: PORT }, app.fetch);
};
