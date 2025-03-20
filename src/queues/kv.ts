import { logger } from "../config/logger.ts";
import {
  QueueMessage,
  QueueType,
  ShamanMessage,
  SourceMessage,
  SpellMessage,
} from "../types/queue.ts";

class EventQueue {
  private kv: Deno.Kv;

  /**
   * Initialize the event queue
   */
  constructor(kv: Deno.Kv) {
    this.kv = kv;
  }

  /**
   * Publish a message to the queue
   *
   * @param type The type of message being published
   * @param message The message payload
   * @returns A promise resolving to the enqueued value
   */
  publish = <T>(type: QueueType, message: T) => {
    logger.info(`Publishing ${type} message to event queue`);
    const queueMessage: QueueMessage<T> = { type, data: message };
    return this.kv.enqueue(queueMessage);
  };

  /**
   * Register handlers for different message types
   *
   * @param handlers An object mapping message types to handler functions
   */
  subscribe = (
    handlers: Record<QueueType, (message: unknown) => void | Promise<void>>,
  ) => {
    logger.info("Starting event queue listener");

    this.kv.listenQueue(async (queueMessage: QueueMessage<unknown>) => {
      const { type, data } = queueMessage;

      const handler = handlers[type];

      if (!handler) {
        logger.warn(`No handler found for ${type} message`);
        return;
      }

      try {
        logger.info(`Processing ${type} message`);
        await handler(data);
      } catch (error) {
        logger.error(
          `Error processing ${type} message: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    });
  };
}

// Create a singleton instance of the event queue
const kv = await Deno.openKv();
export const eventQueue = new EventQueue(kv);

// Re-export message publishing functions for convenience
export const publishSource = (message: SourceMessage) =>
  eventQueue.publish(QueueType.SOURCE, message);
export const publishSpell = (message: SpellMessage) =>
  eventQueue.publish(QueueType.SPELL, message);
export const publishShaman = (message: ShamanMessage) =>
  eventQueue.publish(QueueType.SHAMAN, message);
