import { initializeLogger, logger } from "./config/logger.ts";
import { PORT } from "./config/env.ts";
import { ShamanRequest } from "./types/shaman.ts";
import { executeShaman } from "./services/shamans.ts";
import { isHex } from "viem";

// Initialize logger
initializeLogger();

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function handleRequest(request: Request): Promise<Response> {
  try {
    // Handle preflight requests (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: new Headers(corsHeaders) });
    }

    // Only accept POST requests
    if (request.method !== "POST") {
      logger.warn(`Invalid method: ${request.method}`);
      return new Response("Method not allowed. Please use POST.", {
        status: 405,
        headers: new Headers(corsHeaders),
      });
    }

    // Request checks
    let body: ShamanRequest;
    try {
      body = await request.json();
    } catch (e) {
      logger.error("Failed to parse request body");
      logger.error(e);
      return new Response("Invalid JSON body", {
        status: 400,
        headers: new Headers(corsHeaders),
      });
    }

    if (!body.shamanId) {
      logger.warn("Missing shamanId in request");
      return new Response("Missing shamanId in request body", {
        status: 400,
        headers: new Headers(corsHeaders),
      });
    }

    if (!isHex(body.shamanId)) {
      logger.warn(
        `Invalid shamanId in request: ${body.shamanId}, expected a hex string`,
      );
      return new Response(
        `Invalid shamanId in request: ${body.shamanId}, expected a hex string`,
        {
          status: 400,
          headers: new Headers(corsHeaders),
        },
      );
    }

    // Execute the shaman
    const executionResult = await executeShaman(body.shamanId);

    // Return successful response with CORS headers
    return new Response(JSON.stringify(executionResult), {
      headers: new Headers({
        ...corsHeaders,
        "content-type": "application/json",
      }),
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
        headers: new Headers({
          ...corsHeaders,
          "content-type": "application/json",
        }),
      },
    );
  }
}

// Start the server
Deno.serve({ port: PORT }, handleRequest);