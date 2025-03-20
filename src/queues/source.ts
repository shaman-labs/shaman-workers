import { Hex } from "viem";
import { logger } from "../config/logger.ts";
import { publishSource } from "./kv.ts";
import { processShamansBySource } from "../services/shamans.ts";
import { SourceMessage } from "../types/queue.ts";

export const publishSourceMessage = (
  sourceId: Hex,
  context: Record<string, unknown>,
) => {
  const message: SourceMessage = { sourceId, context };
  logger.info(`Publishing source trigger: ${message.sourceId}`);
  return publishSource(message);
};

export const handleSourceMessage = async (msg: SourceMessage) => {
  logger.info(`Processing source trigger: ${msg.sourceId}`);
  await processShamansBySource(msg);
};
