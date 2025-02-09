import {
  encodeFunctionData,
  formatEther,
  Hex,
  parseEther,
  parseUnits,
  PublicClient,
} from "viem";
import { createServerClient } from "../services/privy.ts";

export interface ShamanMetadata {
  prompt: string;
  code: string;
  createdAt: string;
}

export interface ShamanEntity {
  shamanId: Hex;
  shamanCreator: Hex;
  shamanActive: boolean;
  shamanBalance: bigint;
  shamanMetadata: ShamanMetadata;
}

export interface ShamanContext {
  fetch: typeof fetch;
  publicClient: PublicClient;
  walletClient: typeof createServerClient;
  encodeFunctionData: typeof encodeFunctionData;
  parseEther: typeof parseEther;
  parseUnits: typeof parseUnits;
  formatEther: typeof formatEther;
  shamanCreator: Hex;
}

export interface ShamanRequest {
  shamanId: Hex;
}

export interface ExecutionResult {
  success: boolean;
  decodedCode?: string;
  result: unknown;
  timestamp: number;
}

export interface Transaction {
  to: Hex;
  value: bigint;
  data: Hex;
}
