import { Hex } from "viem";
import { logger } from "../config/logger.ts";
import { SourceMessage } from "../types/common.ts";

const kv = await Deno.openKv();

export const enqueueFromSource = (
  sourceId: Hex,
  context: Record<string, unknown>,
) => {
  const message: SourceMessage = { sourceId, context };
  logger.info(`Enqueuing source message: ${message}`);

  return kv.enqueue(message);
};

export const listenForSourceMessages = () => {
  logger.info("Listening for source messages");
  kv.listenQueue((msg: SourceMessage) => {
    // TODO: Implement the logic to process the message
    logger.info(`Received source message: ${msg.sourceId}`);
  });
};

export default kv;
