import { load } from "jsr:@std/dotenv";
import { logger } from "./logger.ts";

await load({ export: true });

// Environment variables
export const PORT = Number(Deno.env.get("PORT") ?? 8000);
export const IPFS_GATEWAY = Deno.env.get("IPFS_GATEWAY") ?? "https://ipfs.io/ipfs/";

// Log configuration
logger.info(`Using PORT: ${PORT}`);
logger.info(`Using IPFS Gateway: ${IPFS_GATEWAY}`);

// Privy Configuration
export const PRIVY_APP_ID = Deno.env.get("PRIVY_APP_ID") ?? "";
export const PRIVY_APP_SECRET = Deno.env.get("PRIVY_APP_SECRET") ?? "";
export const PRIVY_AUTH_PRIVATE_KEY = Deno.env.get("PRIVY_AUTH_PRIVATE_KEY") ?? "";

if (!PRIVY_APP_ID || !PRIVY_APP_SECRET || !PRIVY_AUTH_PRIVATE_KEY) {
  logger.error("Missing Privy environment variables");
  Deno.exit(1);
}

// EVM Configuration
export const ARB_SEPOLIA_RPC_URL = Deno.env.get("ARB_SEPOLIA_RPC_URL") ?? "https://arbitrum-sepolia-rpc.publicnode.com";

// Log EVM configuration
logger.info(`Using ARB_SEPOLIA_RPC_URL: ${ARB_SEPOLIA_RPC_URL}`);