import { decodeBase64 } from "jsr:@std/encoding/base64";
import { logger } from "../config/logger.ts";
import { ShamanContext } from "../types/shaman.ts";

const SEPARATOR = "=".repeat(80);

function decodeCode(str: string): string {
  const bytes = decodeBase64(str);
  return new TextDecoder().decode(bytes);
}

export async function executeCode(code: string, context: ShamanContext): Promise<{ success: boolean, decodedCode?: string, result: unknown }> {
  try {
    logger.debug("Preparing to execute code");

    // First decode the base64 code
    const decodedCode = decodeCode(code);
    logger.debug(`Decoded code:\n${SEPARATOR}\n${decodedCode}\n${SEPARATOR}`);

    // Create a data URL with the decoded TypeScript code
    const dataUrl = `data:application/typescript,${encodeURIComponent(decodedCode)}`;
    logger.debug(`Data URL:\n${SEPARATOR}\n${dataUrl}\n${SEPARATOR}`);

    logger.debug("Importing and executing shaman code");
    const { default: shamanFunction } = await import(dataUrl);
    const result = await shamanFunction(context);
    logger.debug("Code execution completed successfully");
    logger.debug(`Result: ${JSON.stringify(result)}`);
    return { success: true, decodedCode, result };
  } catch (error) {
    logger.error("Error executing code:", error);
    return { success: false, result: error };
  }
} 