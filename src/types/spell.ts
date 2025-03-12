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
import { JobState } from "./common.ts";

export interface SpellMetadata {
  prompt: string;
  code: string;
  createdAt: string;
}

export interface SpellEntity {
  spellId: Hex;
  spellName: string;
  spellCreator: Address;
  spellMetadata: SpellMetadata;
}

export interface ShamanSpellEntity extends SpellEntity {
  spellVersion: bigint;
  spellState: JobState;
}

export interface SpellContext {
  fetch: typeof fetch;
  publicClient: PublicClient;
  walletClient: ServerWalletClient;
  encodeFunctionData: typeof encodeFunctionData;
  parseEther: typeof parseEther;
  parseUnits: typeof parseUnits;
  formatEther: typeof formatEther;
  spellCreator: Address;
  shamanCreator: Address;
  previousResults?: unknown;
  extraArgs?: unknown;
}
