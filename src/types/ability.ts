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

export interface AbilityMetadata {
  prompt: string;
  code: string;
  createdAt: string;
}

export interface AbilityEntity {
  abilityId: Hex;
  abilityName: string;
  abilityCreator: Address;
  abilityMetadata: AbilityMetadata;
}

export interface AbilityContext {
  fetch: typeof fetch;
  publicClient: PublicClient;
  walletClient: ServerWalletClient;
  encodeFunctionData: typeof encodeFunctionData;
  parseEther: typeof parseEther;
  parseUnits: typeof parseUnits;
  formatEther: typeof formatEther;
  abilityCreator: Address;
  shamanCreator: Address;
  previousResults?: unknown;
  extraArgs?: unknown;
}
