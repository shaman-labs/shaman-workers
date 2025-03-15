import { Hex } from "viem";
import { logger } from "../config/logger.ts";
import { SourceMessage } from "../types/common.ts";
import { processShamansBySource } from "../services/shamans.ts";

const kv = await Deno.openKv();

export const enqueueFromSource = (
  sourceId: Hex,
  context: Record<string, unknown>,
) => {
  const message: SourceMessage = { sourceId, context };
  logger.info(`Enqueuing source message with sourceId: ${message.sourceId}`);

  return kv.enqueue(message);
};

export const listenForSourceMessages = () => {
  logger.info("Listening for source messages");
  kv.listenQueue((msg: SourceMessage) => {
    // TODO: this will break on large numbers of shamanIds
    logger.info(`Received source message: ${msg.sourceId}`);
    processShamansBySource(msg);
  });
};

export default kv;
