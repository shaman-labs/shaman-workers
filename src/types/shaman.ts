import { Address, Hex } from "viem";
import { AbilityEntity } from "./ability.ts";

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
  shamanAbilityIds: string[];
  shamanSourceIds: string[];
  shamanAbilities: AbilityEntity[];
}
