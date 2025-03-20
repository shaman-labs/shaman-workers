import { initializeLogger } from "./config/logger.ts";
import { eventQueue } from "./queues/kv.ts";
import { handleShamanMessage } from "./queues/shaman.ts";
import { handleSourceMessage } from "./queues/source.ts";
import { handleSpellMessage } from "./queues/spell.ts";
import { initializeRoutes } from "./routes/index.ts";
import {
  QueueType,
  ShamanMessage,
  SourceMessage,
  SpellMessage,
} from "./types/queue.ts";
import { initializeIntervalWorkers } from "./workers/interval.ts";

// Initialize core systems
initializeLogger();
initializeRoutes();

// Start the event queue with handlers for each message type
eventQueue.subscribe({
  [QueueType.SOURCE]: (msg) => handleSourceMessage(msg as SourceMessage),
  [QueueType.SPELL]: (msg) => handleSpellMessage(msg as SpellMessage),
  [QueueType.SHAMAN]: (msg) => handleShamanMessage(msg as ShamanMessage),
});

// Start interval-based workers
initializeIntervalWorkers();
