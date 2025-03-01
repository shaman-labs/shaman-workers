import { Address, Hex } from "viem";
import { ShamanEntity } from "./shaman.ts";

export enum WorkflowState {
  Idle = 0,
  Queue = 1,
  InProgress = 2,
  Completed = 3,
}

export interface WorkflowEntity {
  workflowId: Hex;
  workflowState: WorkflowState;
  workflowActive: boolean;
  workflowBalance: bigint;
  workflowCreator: Address;
  workflowShamanIds: string[];
  workflowSourceIds: string[];
  workflowShamans: ShamanEntity[];
}
