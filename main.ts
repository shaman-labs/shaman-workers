// main.ts
import { decodeBase64 } from "https://deno.land/std/encoding/base64.ts";

// Define the interface for the JSON metadata
interface ShamanMetadata {
  shamanName: string;
  prompt: string;
  code: string;
  createdAt: string;
}

// Define the context type that the shaman code expects
interface ShamanContext {
  fetch: typeof fetch;
}

function decodeCode(str: string): string {
  // Decode base64 using TextDecoder
  const bytes = decodeBase64(str);
  return new TextDecoder().decode(bytes);
}

async function executeCode(code: string): Promise<unknown> {
  // Create a temporary file with the TypeScript code
  const tempFile = await Deno.makeTempFile({ suffix: '.ts' });
  await Deno.writeTextFile(tempFile, code);

  try {
    // Create the context object with required dependencies
    const context: ShamanContext = {
      fetch,
    };

    // Import and execute the code
    const { default: shamanFunction } = await import(`file://${tempFile}`);
    const result = await shamanFunction(context);
    return result;
  } finally {
    // Clean up the temporary file
    await Deno.remove(tempFile);
  }
}

// Fetch and process the metadata
const response = await fetch("https://ipfs.io/ipfs/Qmc1DQXPvK8BbBpnqt2RTmHYSKNDAx3evozK2GMX7DQ85b");
if (!response.ok) {
  throw new Error(`Failed to fetch metadata: ${response.status}`);
}

const metadata: ShamanMetadata = await response.json();

// Print the metadata information
console.log("Shaman Name:", metadata.shamanName);
console.log("Prompt:", metadata.prompt);
console.log("Created At:", metadata.createdAt);
console.log("\nDecoded Code:");
const decodedCode = decodeCode(metadata.code);
console.log(decodedCode);

// Execute the code
console.log("\nExecuting code...");
try {
  const result = await executeCode(decodedCode);
  console.log("Result:", result);
} catch (error) {
  console.error("Error executing code:", error);
}