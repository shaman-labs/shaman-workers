import { decodeBase64 } from "jsr:@std/encoding/base64";
import { logger } from "../config/logger.ts";
import { SpellContext } from "../types/spell.ts";
import { CodeExecutionResult } from "../types/common.ts";

const SEPARATOR = "=".repeat(80);

function decodeCode(str: string): string {
  const bytes = decodeBase64(str);
  return new TextDecoder().decode(bytes);
}

export async function executeCode(
  code: string,
  context: SpellContext,
): Promise<CodeExecutionResult> {
  try {
    logger.debug("Preparing to execute code");

    // First decode the base64 code
    const decodedCode = decodeCode(code);
    logger.debug(`Decoded code:\n${SEPARATOR}\n${decodedCode}\n${SEPARATOR}`);

    // Create a data URL with the decoded TypeScript code
    const dataUrl = `data:application/typescript,${
      encodeURIComponent(decodedCode)
    }`;
    logger.debug(`Data URL:\n${SEPARATOR}\n${dataUrl}\n${SEPARATOR}`);

    logger.debug("Importing and executing spell code");
    const { default: spellFunction } = await import(dataUrl);
    const result = await spellFunction(context);
    logger.debug("Code execution completed successfully");
    logger.debug(
      `Result: ${
        typeof result === "object" ? JSON.stringify(result, null, 2) : result
      }`,
    );
    return { success: true, decodedCode, result, timestamp: Date.now() };
  } catch (error) {
    logger.error(
      `Error executing code: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return { success: false, result: error, timestamp: Date.now() };
  }
}
