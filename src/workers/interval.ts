import { logger } from "../config/logger.ts";
import { publishSourceMessage } from "../queues/source.ts";
import { Source, SourceIds } from "../types/source.ts";

export const initializeIntervalWorkers = () => {
  logger.info("Initializing interval workers");

  Deno.cron("Interval Source Quarter Hourly", { minute: { every: 15 } }, () => {
    publishSourceMessage(SourceIds[Source.QUARTER_HOURLY], {
      timestamp: Date.now(),
    });
  });

  Deno.cron("Interval Source Hourly", { hour: { every: 1 } }, () => {
    publishSourceMessage(SourceIds[Source.HOURLY], {
      timestamp: Date.now(),
    });
  });

  Deno.cron("Interval Source Daily", { dayOfMonth: { every: 1 } }, () => {
    publishSourceMessage(SourceIds[Source.DAILY], {
      timestamp: Date.now(),
    });
  });
};
