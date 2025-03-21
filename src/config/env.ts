import { load } from "jsr:@std/dotenv";
import { logger } from "./logger.ts";

await load({ export: true });

const assertEnv = (name: string, value: string | number) => {
  if (!value) {
    logger.error(`Missing ${name} environment variable`);
    Deno.exit(1);
  }
};

// Environment variables
export const PORT = Number(Deno.env.get("PORT") ?? 8000);
export const IPFS_GATEWAY = Deno.env.get("IPFS_GATEWAY") ??
  "https://ipfs.io/ipfs/";

// Log configuration
logger.info(`Using PORT: ${PORT}`);
logger.info(`Using IPFS Gateway: ${IPFS_GATEWAY}`);

// Privy Configuration
export const PRIVY_APP_ID = Deno.env.get("PRIVY_APP_ID") ?? "";
export const PRIVY_APP_SECRET = Deno.env.get("PRIVY_APP_SECRET") ?? "";
export const PRIVY_AUTH_PRIVATE_KEY = Deno.env.get("PRIVY_AUTH_PRIVATE_KEY") ??
  "";

assertEnv("PRIVY_APP_ID", PRIVY_APP_ID);
assertEnv("PRIVY_APP_SECRET", PRIVY_APP_SECRET);
assertEnv("PRIVY_AUTH_PRIVATE_KEY", PRIVY_AUTH_PRIVATE_KEY);

// EVM Configuration
export const OPERATOR_PRIVATE_KEY = Deno.env.get("OPERATOR_PRIVATE_KEY") ?? "";
export const RPC_URL = Deno.env.get("RPC_URL") ??
  "https://arbitrum-sepolia-rpc.publicnode.com";
export const WORLD_ADDRESS = Deno.env.get("WORLD_ADDRESS") ?? "";
export const CHAIN_ID = Number(Deno.env.get("CHAIN_ID") ?? 421614);

assertEnv("OPERATOR_PRIVATE_KEY", OPERATOR_PRIVATE_KEY);
assertEnv("WORLD_ADDRESS", WORLD_ADDRESS);
// Log EVM configuration
logger.info(`Using RPC_URL: ${RPC_URL}`);
logger.info(`Using CHAIN_ID: ${CHAIN_ID}`);

// Filebase Configuration
export const S3_KEY = Deno.env.get("S3_KEY") ?? "";
export const S3_SECRET = Deno.env.get("S3_SECRET") ?? "";
export const S3_BUCKET = Deno.env.get("S3_BUCKET") ?? "";

assertEnv("S3_KEY", S3_KEY);
assertEnv("S3_SECRET", S3_SECRET);
assertEnv("S3_BUCKET", S3_BUCKET);

// Ox Configuration
export const OX_API_KEY = Deno.env.get("OX_API_KEY") ?? "";

assertEnv("OX_API_KEY", OX_API_KEY);

// Upstash Configuration
export const UPSTASH_REDIS_URL = Deno.env.get("UPSTASH_REDIS_URL") ?? "";
export const UPSTASH_REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_TOKEN") ?? "";

assertEnv("UPSTASH_REDIS_URL", UPSTASH_REDIS_URL);
assertEnv("UPSTASH_REDIS_TOKEN", UPSTASH_REDIS_TOKEN);
