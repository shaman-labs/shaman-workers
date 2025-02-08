import { load } from "jsr:@std/dotenv";
import { logger } from "./logger.ts";

await load({ export: true });

const assertEnv = (name: string, value: string) => {
  if (!value) {
    logger.error(`Missing ${name} environment variable`);
    Deno.exit(1);
  }
};

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

assertEnv("PRIVY_APP_ID", PRIVY_APP_ID);
assertEnv("PRIVY_APP_SECRET", PRIVY_APP_SECRET);
assertEnv("PRIVY_AUTH_PRIVATE_KEY", PRIVY_AUTH_PRIVATE_KEY);

// EVM Configuration
export const OPERATOR_PRIVATE_KEY = Deno.env.get("OPERATOR_PRIVATE_KEY") ?? "";
export const ARB_SEPOLIA_RPC_URL = Deno.env.get("ARB_SEPOLIA_RPC_URL") ?? "https://arbitrum-sepolia-rpc.publicnode.com";
export const WORLD_ADDRESS = Deno.env.get("WORLD_ADDRESS") ?? "";

assertEnv("OPERATOR_PRIVATE_KEY", OPERATOR_PRIVATE_KEY);
assertEnv("WORLD_ADDRESS", WORLD_ADDRESS);

// Log EVM configuration
logger.info(`Using ARB_SEPOLIA_RPC_URL: ${ARB_SEPOLIA_RPC_URL}`);