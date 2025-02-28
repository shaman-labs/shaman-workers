import { initializeLogger } from "./config/logger.ts";
import { initializeRoutes } from "./routes/index.ts";
import { listenForSourceMessages } from "./queues/source.ts";
import { initializeIntervalWorkers } from "./workers/interval.ts";

initializeLogger();
initializeRoutes();
listenForSourceMessages();
initializeIntervalWorkers();
