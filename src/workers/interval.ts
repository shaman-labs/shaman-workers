import { logger } from "../config/logger.ts";
import { enqueueFromSource } from "../queues/source.ts";

export const initializeIntervalWorkers = () => {
  logger.info("Initializing interval workers");

  Deno.cron("Interval Source Quarter Hourly", { minute: { every: 15 } }, () => {
    enqueueFromSource("interval-quarter-hourly", {
      timestamp: Date.now(),
    });
  });

  Deno.cron("Interval Source Hourly", { hour: { every: 1 } }, () => {
    enqueueFromSource("interval-hourly", {
      timestamp: Date.now(),
    });
  });

  Deno.cron("Interval Source Daily", { dayOfMonth: { every: 1 } }, () => {
    enqueueFromSource("interval-daily", {
      timestamp: Date.now(),
    });
  });
};
