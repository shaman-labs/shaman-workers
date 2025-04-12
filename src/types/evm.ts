import { Hex } from "viem";

export interface GasInfo {
  address: Hex;
  balance: bigint;
  gasPrice: bigint;
  hasBalance: boolean;
  formattedBalance: string;
}

export enum ContractErrorType {
  INSUFFICIENT_GAS = "INSUFFICIENT_GAS",
  NONCE_TOO_LOW = "NONCE_TOO_LOW",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  SIMULATION_FAILED = "SIMULATION_FAILED",
  UNKNOWN = "UNKNOWN",
}

export class ContractError extends Error {
  type: ContractErrorType;
  data?: unknown;

  constructor(message: string, type: ContractErrorType, data?: unknown) {
    super(message);
    this.name = "ContractError";
    this.type = type;
    this.data = data;
  }
}
