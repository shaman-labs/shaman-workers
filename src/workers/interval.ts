import { logger } from "../config/logger.ts";
import { enqueueFromSource } from "../queues/source.ts";
import { Source, SourceIds } from "../types/source.ts";

export const initializeIntervalWorkers = () => {
  logger.info("Initializing interval workers");

  Deno.cron("Interval Source Quarter Hourly", { minute: { every: 15 } }, () => {
    enqueueFromSource(SourceIds[Source.QUARTER_HOURLY], {
      timestamp: Date.now(),
    });
  });

  Deno.cron("Interval Source Hourly", { hour: { every: 1 } }, () => {
    enqueueFromSource(SourceIds[Source.HOURLY], {
      timestamp: Date.now(),
    });
  });

  Deno.cron("Interval Source Daily", { dayOfMonth: { every: 1 } }, () => {
    enqueueFromSource(SourceIds[Source.DAILY], {
      timestamp: Date.now(),
    });
  });
};
