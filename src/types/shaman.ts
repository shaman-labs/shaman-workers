import {
  Address,
  encodeFunctionData,
  formatEther,
  Hex,
  parseEther,
  parseUnits,
  PublicClient,
} from "viem";
import { ServerWalletClient } from "../services/privy.ts";

export interface ShamanMetadata {
  prompt: string;
  code: string;
  createdAt: string;
}

export interface ShamanEntity {
  shamanId: Hex;
  shamanName: string;
  shamanCreator: Address;
  shamanMetadata: ShamanMetadata;
}

export interface ShamanContext {
  fetch: typeof fetch;
  publicClient: PublicClient;
  walletClient: ServerWalletClient;
  encodeFunctionData: typeof encodeFunctionData;
  parseEther: typeof parseEther;
  parseUnits: typeof parseUnits;
  formatEther: typeof formatEther;
  shamanCreator: Address;
  workflowCreator: Address;
  previousResults?: unknown;
  extraArgs?: unknown;
}
