import { initializeLogger, logger } from "./config/logger.ts";
import { PORT } from "./config/env.ts";
import { ShamanRequest } from "./types/shaman.ts";
import { executeShaman } from "./services/shamans.ts";
import { isHex } from "viem";

// Initialize logger
initializeLogger();

async function handleRequest(request: Request): Promise<Response> {
  try {
    // Only accept POST requests
    if (request.method !== "POST") {
      logger.warn(`Invalid method: ${request.method}`);
      return new Response("Method not allowed. Please use POST.", {
        status: 405,
      });
    }

    // Request checks
    let body: ShamanRequest;
    try {
      body = await request.json();
    } catch (e) {
      logger.error("Failed to parse request body");
      logger.error(e);
      return new Response("Invalid JSON body", { status: 400 });
    }

    if (!body.shamanId) {
      logger.warn("Missing shamanId in request");
      return new Response("Missing shamanId in request body", { status: 400 });
    }

    if (!isHex(body.shamanId)) {
      logger.warn(
        `Invalid shamanId in request: ${body.shamanId}, expected a hex string`,
      );
      return new Response(
        `Invalid shamanId in request: ${body.shamanId}, expected a hex string`,
        { status: 400 },
      );
    }

    // Execute the shaman
    const executionResult = await executeShaman(body.shamanId);

    return new Response(JSON.stringify(executionResult), {
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error: unknown) {
    logger.error(
      `Error processing request: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    return new Response(
      JSON.stringify({
        error: error instanceof Error
          ? error.message
          : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }
}

// Start the server
Deno.serve({ port: PORT }, handleRequest);
