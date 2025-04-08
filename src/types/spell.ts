import { Address, Hex, PublicClient } from "viem";
import * as viem from "viem";
import { ServerWalletClient } from "../services/privy.ts";
import { JobState } from "./common.ts";
import { apiClient, oxApiClient } from "../services/api.ts";

export interface SpellMetadata {
  prompt: string;
  code: string;
  createdAt: string;
}

export interface SpellEntity {
  spellId: Hex;
  spellName: string;
  spellCreator: Address;
}

export interface ShamanSpellEntity extends SpellEntity {
  shamanSpellId: Hex;
  chain: string;
  spellVersion: bigint;
  spellState: JobState;
  spellMetadata: SpellMetadata;
}

export interface ShamanSpellEdgeEntity {
  fromShamanSpellId?: Hex;
  toShamanSpellId?: Hex;
}

export interface SpellContext {
  publicClient: PublicClient;
  walletClient: ServerWalletClient;
  apiClient: typeof apiClient;
  oxApiClient: typeof oxApiClient;
  viem: typeof viem;
  spellCreator: Address; // fetched from contract
  shamanCreator: Address; // fetched from contract
  previousResults?: unknown; // previous spell results
  secrets?: unknown; // user secrets
}
