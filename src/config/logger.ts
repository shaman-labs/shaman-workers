import { ConsoleHandler, getLogger, setup } from "jsr:@std/log";

// Helper function to safely format log messages
const formatLogValue = (value: unknown): string => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";

  if (typeof value === "object") {
    try {
      // Use pretty-printing for objects (with 2-space indentation)
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return `[Object that couldn't be stringified: ${
        Object.prototype.toString.call(value)
      }]`;
    }
  }

  return String(value);
};

// Configure logging
export function initializeLogger() {
  setup({
    handlers: {
      console: new ConsoleHandler("DEBUG", {
        formatter: (record) => {
          // Format the message properly
          let formattedMsg = record.msg;

          // If the message is an object, format it properly
          if (typeof record.msg === "object") {
            formattedMsg = formatLogValue(record.msg);
          }

          return `[${record.levelName}] ${formattedMsg}`;
        },
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
