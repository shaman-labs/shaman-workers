import { PrivyClient } from "@privy-io/server-auth";
import {
  Abi,
  Address,
  encodeFunctionData,
  Hex,
  TransactionRequest,
  TransactionSerializable,
  TypedData,
} from "viem";
import {
  PRIVY_APP_ID,
  PRIVY_APP_SECRET,
  PRIVY_AUTH_PRIVATE_KEY,
} from "../config/env.ts";
import { logger } from "../config/logger.ts";
import { Transaction } from "../types/common.ts";

export class ServerWalletClient {
  constructor(public address: Hex, public chainId: number) {
    if (!address) {
      throw new Error("Address is required");
    }
    if (!chainId) {
      throw new Error("ChainId is required");
    }
  }

  async signMessage({ message }: { message: string | Uint8Array }) {
    logger.info(`Signing message with address: ${this.address}`);
    const { signature } = await privy.walletApi.ethereum.signMessage({
      address: this.address,
      chainType: "ethereum",
      message,
    });

    return signature;
  }

  async signTypedData<
    TTypedData extends TypedData | { [key: string]: unknown },
    TPrimaryType extends string,
  >({
    domain,
    types,
    primaryType,
    message,
  }: {
    domain: TTypedData["domain"];
    types: TTypedData["types"];
    primaryType: TPrimaryType;
    message: Record<string, unknown>;
  }) {
    logger.info(`Signing typed data with address: ${this.address}`);
    const { signature } = await privy.walletApi.ethereum.signTypedData({
      address: this.address,
      chainType: "ethereum",
      typedData: {
        domain,
        types,
        message,
        primaryType,
      },
    });

    return signature;
  }

  async signTransaction<
    TTransactionSerializable extends TransactionSerializable,
  >(
    transaction: TTransactionSerializable,
  ) {
    logger.info(
      `Signing transaction to: ${transaction.to}, chainId: ${this.chainId}`,
    );
    const { signedTransaction } = await privy.walletApi.ethereum
      .signTransaction({
        address: this.address,
        chainType: "ethereum",
        transaction: {
          to: transaction.to,
          value: transaction.value !== undefined
            ? Number(transaction.value)
            : undefined,
          data: transaction.data,
          chainId: this.chainId,
          nonce: transaction.nonce,
          gasLimit: transaction.gas !== undefined
            ? Number(transaction.gas)
            : undefined,
          gasPrice: transaction.gasPrice !== undefined
            ? Number(transaction.gasPrice)
            : undefined,
          maxFeePerGas: transaction.maxFeePerGas !== undefined
            ? Number(transaction.maxFeePerGas)
            : undefined,
          maxPriorityFeePerGas: transaction.maxPriorityFeePerGas !== undefined
            ? Number(transaction.maxPriorityFeePerGas)
            : undefined,
          type: transaction.type,
        },
      });

    return signedTransaction;
  }

  async writeContract<TAbi extends Abi | readonly unknown[]>({
    address,
    abi,
    functionName,
    args,
    ...transaction
  }: {
    address: Address;
    abi: TAbi;
    functionName: string;
    args?: readonly unknown[];
  } & Omit<TransactionRequest, "to" | "data">) {
    logger.info(
      `Writing to contract at: ${address}, function: ${functionName}, chainId: ${this.chainId}`,
    );

    const data = encodeFunctionData({
      abi: abi as Abi,
      functionName,
      args,
    });

    const { hash } = await privy.walletApi.ethereum.sendTransaction({
      address: this.address,
      chainType: "ethereum",
      caip2: `eip155:${this.chainId}`,
      transaction: {
        to: address,
        value: transaction.value !== undefined
          ? Number(transaction.value)
          : undefined,
        data,
        chainId: this.chainId,
        nonce: transaction.nonce,
        gasLimit: transaction.gas !== undefined
          ? Number(transaction.gas)
          : undefined,
        gasPrice: transaction.gasPrice !== undefined
          ? Number(transaction.gasPrice)
          : undefined,
        maxFeePerGas: transaction.maxFeePerGas !== undefined
          ? Number(transaction.maxFeePerGas)
          : undefined,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas !== undefined
          ? Number(transaction.maxPriorityFeePerGas)
          : undefined,
        type: transaction.type,
      },
    });

    return hash;
  }

  async sendTransaction(tx: Transaction) {
    logger.info(
      `Sending transaction to: ${tx.to}, value: ${tx.value}, chainId: ${this.chainId}`,
    );
    const { hash } = await privy.walletApi.ethereum.sendTransaction({
      address: this.address,
      chainType: "ethereum",
      caip2: `eip155:${this.chainId}`,
      transaction: {
        to: tx.to,
        value: Number(tx.value),
        data: tx.data,
        chainId: this.chainId,
      },
    });

    return hash;
  }
}

export const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET, {
  walletApi: {
    authorizationPrivateKey: PRIVY_AUTH_PRIVATE_KEY,
  },
});
