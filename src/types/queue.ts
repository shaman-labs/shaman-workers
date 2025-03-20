import { Hex } from "npm:viem";
import { CodeExecutionResult } from "./common.ts";
import { SpellContext } from "./spell.ts";

export enum QueueType {
  SOURCE = "source",
  SPELL = "spell",
  SHAMAN = "shaman",
}

export interface SourceMessage {
  sourceId: Hex;
  context: Record<string, unknown>;
}

export interface SpellMessage {
  shamanId: Hex;
  spellId: Hex;
  context: SpellContext;
  nextSpellIndex?: number;
  results?: CodeExecutionResult[];
}

export interface ShamanMessage {
  shamanId: Hex;
  results: CodeExecutionResult[];
  success: boolean;
}

export interface QueueMessage<T> {
  type: QueueType;
  data: T;
}
