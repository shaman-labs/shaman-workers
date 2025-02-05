import { getLogger, setup, ConsoleHandler } from "jsr:@std/log";
import { load } from "jsr:@std/dotenv";

await load({ export: true });

// Configure logging
setup({
  handlers: {
    console: new ConsoleHandler("DEBUG", {
      formatter: (record) => {
        return `[${record.levelName}] ${record.msg}`;
      }
    }),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console"],
    },
  },
});

const logger = getLogger();
logger.info("Starting IPFS proxy server...");

// Get IPFS gateway from environment variable or use default
const IPFS_GATEWAY = Deno.env.get("IPFS_GATEWAY") ?? "https://ipfs.io/ipfs/";
logger.info(`Using IPFS Gateway: ${IPFS_GATEWAY}`);

Deno.serve({ port: 3001 }, async (req) => {
  const requestId = crypto.randomUUID();
  logger.debug(`[${requestId}] New request received: ${req.method} ${req.url}`);

  const url = new URL(req.url);
  const path = url.pathname;
  logger.debug(`[${requestId}] Parsed path: ${path}`);

  // Check if path starts with a slash and has content
  if (path.length <= 1) {
    logger.warn(`[${requestId}] Request rejected: No CID provided in path`);
    return new Response("Please provide a CID", { status: 400 });
  }

  // Extract CID (remove leading slash)
  const cid = path.substring(1);
  logger.info(`[${requestId}] Processing request for CID: ${cid}`);

  try {
    // Fetch content from IPFS
    const ipfsUrl = `${IPFS_GATEWAY}${cid}`;
    logger.debug(`[${requestId}] Initiating IPFS fetch from: ${ipfsUrl}`);

    const fetchStart = performance.now();
    const response = await fetch(ipfsUrl);
    const fetchEnd = performance.now();

    logger.debug(`[${requestId}] IPFS fetch completed in ${(fetchEnd - fetchStart).toFixed(2)}ms with status: ${response.status}`);

    if (!response.ok) {
      logger.error(`[${requestId}] IPFS fetch failed with status: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }

    const content = await response.text();
    logger.debug(`[${requestId}] Successfully retrieved content from IPFS. Content length: ${content.length} bytes`);

    // Basic content validation
    if (content.trim().length === 0) {
      logger.warn(`[${requestId}] Retrieved empty content from IPFS`);
    }

    logger.info(`[${requestId}] Returning TypeScript content for CID: ${cid}`);
    return new Response(content, {
      headers: {
        "content-type": "application/typescript",
        "x-request-id": requestId,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`[${requestId}] Error processing request: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      logger.debug(`[${requestId}] Error stack trace: ${error.stack}`);
    }
    return new Response(`Error: ${errorMessage}`, {
      status: 500,
      headers: {
        "x-request-id": requestId,
      }
    });
  }
});
