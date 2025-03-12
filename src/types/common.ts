import { Hex } from "viem";

export enum JobState {
  Idle = 0,
  Queue = 1,
  InProgress = 2,
  Completed = 3,
}

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

export interface SourceMessage {
  sourceId: Hex;
  context: Record<string, unknown>;
}
