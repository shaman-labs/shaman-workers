import { initializeLogger, logger } from "./config/logger.ts";
import { PORT, IPFS_GATEWAY } from "./config/env.ts";
import { executeCode } from "./services/codeExecutor.ts";
import { IpfsRequest, ShamanMetadata, ExecutionResult, ShamanContext } from "./types/shaman.ts";
import { decodeBase64 } from "jsr:@std/encoding/base64";
import { createServerClient } from "./services/privy.ts";
import { publicClient } from "./services/evm.ts";
import { encodeFunctionData, formatEther, parseEther, parseUnits } from "viem";

// Initialize logger
initializeLogger();

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

    const context: ShamanContext = {
      ...metadata,
      fetch,
      publicClient,
      encodeFunctionData,
      parseEther,
      parseUnits,
      formatEther,
      walletClient: createServerClient(metadata.shamanOwner, metadata.chainId),
    };

    // Execute the code
    logger.info("Executing shaman code");
    const result = await executeCode(metadata.code, context);
    logger.info("Shaman execution completed");

    const executionResult: ExecutionResult = {
      shamanId: metadata.shamanId,
      shamanName: metadata.shamanName,
      prompt: metadata.prompt,
      createdAt: metadata.createdAt,
      decodedCode: new TextDecoder().decode(decodeBase64(metadata.code)),
      result
    };

    // Return the complete response
    return new Response(JSON.stringify(executionResult), {
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
Deno.serve({ port: PORT }, handleRequest); 