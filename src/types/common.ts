import { Hex } from "viem";

export interface CodeExecutionResult {
  success: boolean;
  decodedCode?: string;
  result: unknown;
  timestamp: number;
}

export interface ShamanExecutionResult {
  success: boolean;
  results: CodeExecutionResult[];
}

export interface ShamanRequest {
  shamanId: Hex;
}

export interface Transaction {
  to: Hex;
  value: number | bigint | string;
  data: Hex;
}
