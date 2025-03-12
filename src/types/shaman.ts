import { Address, Hex } from "viem";
import { ShamanSpellEntity } from "./spell.ts";
import { JobState } from "./common.ts";

export interface ShamanEntity {
  shamanId: Hex;
  shamanState: JobState;
  shamanActive: boolean;
  shamanBalance: bigint;
  shamanCreator: Address;
  shamanSpellIds: string[];
  shamanSourceIds: string[];
  shamanSpells: ShamanSpellEntity[];
}
