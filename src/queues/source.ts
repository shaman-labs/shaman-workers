import { logger } from "../config/logger.ts";

const kv = await Deno.openKv();

interface SourceMessage {
  source: string;
  context: Record<string, unknown>;
}

export const enqueueFromSource = (
  source: string,
  context: Record<string, unknown>,
) => {
  const message: SourceMessage = { source, context };
  logger.info(`Enqueuing source message: ${message}`);

  return kv.enqueue(message);
};

export const listenForSourceMessages = () => {
  logger.info("Listening for source messages");
  kv.listenQueue((msg: SourceMessage) => {
    // TODO: Implement the logic to process the message
    logger.info(`Received source message: ${msg.source}`);
  });
};

export default kv;
