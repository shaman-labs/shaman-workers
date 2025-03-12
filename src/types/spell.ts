import { Address, Hex, PublicClient } from "viem";
import * as viem from "viem";
import { ServerWalletClient } from "../services/privy.ts";
import { JobState } from "./common.ts";
import { apiClient } from "../services/api.ts";

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
  publicClient: PublicClient;
  walletClient: ServerWalletClient;
  apiClient: typeof apiClient;
  viem: typeof viem;
  spellCreator: Address; // fetched from contract
  shamanCreator: Address; // fetched from contract
  previousResults?: unknown; // previous spell results
  extraArgs?: unknown; // extra arguments for the spell
}
