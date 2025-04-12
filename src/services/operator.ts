import { formatEther, Hex, TransactionReceipt } from "viem";
import { chain, operatorAccount, publicClient } from "./evm.ts";
import { logger } from "../config/logger.ts";
import { setTimeout } from "node:timers/promises";
import { ContractError, ContractErrorType, GasInfo } from "../types/evm.ts";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const DEFAULT_GAS_BUFFER = 1.2; // 20% buffer for gas estimation
const DEFAULT_GAS_ESTIMATE = 100000n;

export const isNonceError = (error: unknown): boolean => {
  const errorMessage = String(error).toLowerCase();
  return (
    errorMessage.includes("nonce too low") ||
    errorMessage.includes("nonce too high") ||
    errorMessage.includes("nonce conflict") ||
    errorMessage.includes("replacement transaction underpriced")
  );
};

export class OperatorService {
  async getGasBalance(): Promise<GasInfo> {
    const balance = await publicClient.getBalance({
      address: operatorAccount.address,
    });

    const gasPrice = await publicClient.getGasPrice();

    return {
      address: operatorAccount.address,
      balance,
      gasPrice,
      hasBalance: balance > 0n,
      formattedBalance: `${balance} wei (${formatEther(balance)} ETH)`,
    };
  }

  async checkGasAvailability(estimatedGas: bigint): Promise<boolean> {
    const { balance, gasPrice } = await this.getGasBalance();

    const bufferedGas = BigInt(
      Math.ceil(Number(estimatedGas) * DEFAULT_GAS_BUFFER),
    );
    const requiredBalance = bufferedGas * gasPrice;

    if (balance <= requiredBalance) {
      const error =
        `Insufficient gas: address ${operatorAccount.address} has ${balance} wei, needs at least ${requiredBalance} wei`;
      logger.error(error);
      throw new ContractError(error, ContractErrorType.INSUFFICIENT_GAS, {
        balance,
        required: requiredBalance,
        gasPrice,
      });
    }

    return true;
  }

  async executeWrite<
    T extends {
      simulate: Record<string, Function>;
      write: Record<string, Function>;
    },
  >(
    contract: T,
    functionName: keyof T["write"],
    args: unknown[],
    options: { gasBuffer?: number } = {},
  ): Promise<{ hash: Hex; receipt: TransactionReceipt }> {
    const gasBuffer = options.gasBuffer || DEFAULT_GAS_BUFFER;
    const functionNameString = String(functionName);
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        attempts++;
        logger.info(
          `Executing contract write: ${functionNameString} (attempt ${attempts}/${MAX_RETRIES})`,
        );

        let simulationResult;
        try {
          simulationResult = await contract.simulate[functionNameString](args, {
            account: operatorAccount,
          });
        } catch (simError) {
          const errorMsg = `Simulation failed for ${functionNameString}: ${
            String(simError)
          }`;
          logger.error(errorMsg);
          throw new ContractError(
            errorMsg,
            ContractErrorType.SIMULATION_FAILED,
            simError,
          );
        }

        const estimatedGas = simulationResult.request.gas ||
          DEFAULT_GAS_ESTIMATE;
        await this.checkGasAvailability(estimatedGas);

        const nonce = await publicClient.getTransactionCount({
          address: operatorAccount.address,
          blockTag: "pending",
        });

        const hash = await contract.write[functionNameString](args, {
          chain,
          account: operatorAccount,
          nonce,
          gas: BigInt(Math.ceil(Number(estimatedGas) * gasBuffer)),
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status !== "success") {
          throw new ContractError(
            `Transaction failed: ${hash}`,
            ContractErrorType.TRANSACTION_FAILED,
            receipt,
          );
        }

        logger.info(`Transaction successful: ${hash}`);
        return { hash, receipt };
      } catch (error) {
        if (attempts >= MAX_RETRIES) {
          // if we've exhausted retries, rethrow the error
          if (error instanceof ContractError) {
            throw error;
          } else {
            throw new ContractError(
              `Contract call failed after ${MAX_RETRIES} attempts: ${
                String(error)
              }`,
              ContractErrorType.UNKNOWN,
              error,
            );
          }
        }

        // if the error is related to nonce issues, retry
        if (isNonceError(error)) {
          logger.warn(`Nonce error detected, retrying: ${String(error)}`);

          // for nonce errors, introduce a delay to allow pending transactions to clear
          await setTimeout(RETRY_DELAY_MS * attempts);
          continue;
        }

        // for other errors, rethrow
        if (error instanceof ContractError) {
          throw error;
        } else {
          throw new ContractError(
            String(error),
            ContractErrorType.UNKNOWN,
            error,
          );
        }
      }
    }

    throw new Error("Unexpected end of contract execution");
  }
}

export const operator = new OperatorService();
