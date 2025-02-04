import { decodeBase64 } from "https://deno.land/std@0.220.1/encoding/base64.ts";
import { getLogger, setup, ConsoleHandler } from "https://deno.land/std@0.220.1/log/mod.ts";
import { load } from "https://deno.land/std@0.220.1/dotenv/mod.ts";

await load({ export: true });

// Configure logging
setup({
  handlers: {
    console: new ConsoleHandler("DEBUG"),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console"],
    },
  },
});

const logger = getLogger();

interface ShamanMetadata {
  shamanName: string;
  prompt: string;
  code: string;
  createdAt: string;
}

interface ShamanContext {
  fetch: typeof fetch;
}

interface IpfsRequest {
  hash: string;
}

// Get IPFS gateway from environment variable or use default
const IPFS_GATEWAY = Deno.env.get("IPFS_GATEWAY") ?? "https://ipfs.io/ipfs/";
logger.info(`Using IPFS Gateway: ${IPFS_GATEWAY}`);

function decodeCode(str: string): string {
  const bytes = decodeBase64(str);
  return new TextDecoder().decode(bytes);
}

async function executeCode(code: string): Promise<unknown> {
  try {
    logger.debug("Preparing to execute code");
    
    // Create a data URL containing the TypeScript code
    const dataUrl = `data:application/typescript;base64,${btoa(code)}`;
    
    const context: ShamanContext = {
      fetch,
    };

    logger.debug("Importing and executing shaman code");
    const { default: shamanFunction } = await import(dataUrl);
    const result = await shamanFunction(context);
    logger.debug("Code execution completed successfully");
    return result;
  } catch (error) {
    logger.error("Error executing code:", error);
    throw error;
  }
}

async function handleRequest(request: Request): Promise<Response> {
  try {
    // Only accept POST requests
    if (request.method !== "POST") {
      logger.warn(`Invalid method: ${request.method}`);
      return new Response('Method not allowed. Please use POST.', { status: 405 });
    }

    // Parse the request body
    let body: IpfsRequest;
    try {
      body = await request.json();
    } catch (e) {
      logger.error("Failed to parse request body");
      logger.error(e);
      return new Response('Invalid JSON body', { status: 400 });
    }

    if (!body.hash) {
      logger.warn("Missing IPFS hash in request");
      return new Response('Missing IPFS hash in request body', { status: 400 });
    }

    // Construct IPFS URL
    const ipfsUrl = `${IPFS_GATEWAY}${body.hash}`;
    logger.info(`Fetching metadata from IPFS: ${ipfsUrl}`);

    // Fetch and process the metadata
    const response = await fetch(ipfsUrl);
    if (!response.ok) {
      logger.error(`Failed to fetch metadata: ${response.status}`);
      return new Response(`Failed to fetch metadata: ${response.status}`, { status: 502 });
    }

    const metadata: ShamanMetadata = await response.json();
    logger.info(`Processing shaman: ${metadata.shamanName}`);

    const decodedCode = decodeCode(metadata.code);
    logger.debug("Successfully decoded base64 code");

    // Execute the code
    logger.info("Executing shaman code");
    const result = await executeCode(decodedCode);
    logger.info("Shaman execution completed");

    // Return the complete response
    return new Response(JSON.stringify({
      shamanName: metadata.shamanName,
      prompt: metadata.prompt,
      createdAt: metadata.createdAt,
      decodedCode,
      result
    }), {
      headers: {
        'content-type': 'application/json',
      },
    });

  } catch (error: unknown) {
    logger.error(`Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: {
        'content-type': 'application/json',
      },
    });
  }
}

// Start the server
logger.info("Server starting on http://localhost:8000");
Deno.serve({ port: 8000 }, handleRequest);