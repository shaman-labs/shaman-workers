import { getLogger, setup, ConsoleHandler } from "jsr:@std/log";

// Configure logging
export function initializeLogger() {
  setup({
    handlers: {
      console: new ConsoleHandler("DEBUG", {
        formatter: (record) => {
          return `[${record.levelName}] ${record.msg}`;
        }
      }),
    },
    loggers: {
      default: {
        level: "DEBUG",
        handlers: ["console"],
      },
    },
  });
}

export const logger = getLogger(); 