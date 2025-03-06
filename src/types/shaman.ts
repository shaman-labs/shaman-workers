import { Address, Hex } from "viem";
import { SpellEntity } from "./spell.ts";

export enum ShamanState {
  Idle = 0,
  Queue = 1,
  InProgress = 2,
  Completed = 3,
}

export interface ShamanEntity {
  shamanId: Hex;
  shamanState: ShamanState;
  shamanActive: boolean;
  shamanBalance: bigint;
  shamanCreator: Address;
  shamanSpellIds: string[];
  shamanSourceIds: string[];
  shamanSpells: SpellEntity[];
}
