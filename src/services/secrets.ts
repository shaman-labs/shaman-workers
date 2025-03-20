import { Hex } from "viem";
import redis from "./upstash.ts";

export const getSecrets = async (spellCreator: Hex) => {
  const secretKeys = await redis.smembers(
    `secret:${spellCreator.toLowerCase()}:keys`,
  );
  const secrets: Record<string, unknown> = {};

  if (secretKeys.length > 0) {
    for (const key of secretKeys) {
      const value = await redis.get(
        `secret:${spellCreator.toLowerCase()}:${key}`,
      );
      if (value !== null) {
        secrets[key] = value;
      }
    }
  }

  return secrets;
};
