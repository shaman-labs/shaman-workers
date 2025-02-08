import { encodeFunctionData, formatEther, Hex, parseEther, parseUnits, PublicClient } from "viem";
import { createServerClient } from "../services/privy.ts";

export interface ShamanMetadata {
  shamanId: string;
  shamanName: string;
  shamanOwner: Hex;
  prompt: string;
  code: string;
  createdAt: string;
  chainId: number;
}

export interface ShamanContext {
  fetch: typeof fetch;
  publicClient: PublicClient;
  walletClient: typeof createServerClient;
  encodeFunctionData: typeof encodeFunctionData;
  parseEther: typeof parseEther;
  parseUnits: typeof parseUnits;
  formatEther: typeof formatEther;
  shamanOwner: Hex;
}

export interface IpfsRequest {
  hash: string;
}

export interface ExecutionResult {
  shamanId: string;
  shamanName: string;
  prompt: string;
  createdAt: string;
  decodedCode: string;
  result: unknown;
}

export interface Transaction {
  to: Hex;
  value: bigint;
  data: Hex;
}
