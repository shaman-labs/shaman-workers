import { logger } from "../config/logger.ts";
import { enqueueFromSource } from "../queues/source.ts";
import { IntervalSource, IntervalSourceId } from "../types/source.ts";

export const initializeIntervalWorkers = () => {
  logger.info("Initializing interval workers");

  Deno.cron("Interval Source Quarter Hourly", { minute: { every: 15 } }, () => {
    enqueueFromSource(IntervalSourceId[IntervalSource.QUARTER_HOURLY], {
      timestamp: Date.now(),
    });
  });

  Deno.cron("Interval Source Hourly", { hour: { every: 1 } }, () => {
    enqueueFromSource(IntervalSourceId[IntervalSource.HOURLY], {
      timestamp: Date.now(),
    });
  });

  Deno.cron("Interval Source Daily", { dayOfMonth: { every: 1 } }, () => {
    enqueueFromSource(IntervalSourceId[IntervalSource.DAILY], {
      timestamp: Date.now(),
    });
  });
};
