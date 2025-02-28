import { initializeLogger, logger } from "./config/logger.ts";
import { PORT } from "./config/env.ts";
import { ShamanRequest } from "./types/shaman.ts";
import { executeShaman } from "./services/shamans.ts";
import { isHex } from "viem";
import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";

// Initialize logger
initializeLogger();

// Create Hono app
const app = new Hono();

// Apply CORS middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Define routes
app.post("/", async (c) => {
  try {
    // Request checks
    let body: ShamanRequest;
    try {
      body = await c.req.json();
    } catch (e) {
      logger.error("Failed to parse request body");
      logger.error(e);
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    if (!body.shamanId) {
      logger.warn("Missing shamanId in request");
      return c.json({ error: "Missing shamanId in request body" }, 400);
    }

    if (!isHex(body.shamanId)) {
      logger.warn(
        `Invalid shamanId in request: ${body.shamanId}, expected a hex string`
      );
      return c.json(
        {
          error: `Invalid shamanId in request: ${body.shamanId}, expected a hex string`,
        },
        400
      );
    }

    // Execute the shaman
    const executionResult = await executeShaman(body.shamanId);

    // Return successful response
    return c.json(executionResult);
  } catch (error: unknown) {
    logger.error(
      `Error processing request: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      500
    );
  }
});

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Start the server
Deno.serve({ port: PORT }, app.fetch);
