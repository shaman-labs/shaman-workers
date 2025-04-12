import { formatEther, Hex, TransactionReceipt } from "viem";
import { chain, operatorAccount, publicClient } from "./evm.ts";
import { logger } from "../config/logger.ts";
import { setTimeout } from "node:timers/promises";
import { ContractError, ContractErrorType, GasInfo } from "../types/evm.ts";
import { worldContract } from "../mud/contract.ts";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const DEFAULT_GAS_BUFFER = 1.2; // 20% buffer for gas estimation
const DEFAULT_GAS_ESTIMATE = 100000n;

type WritableFunctionName = keyof typeof worldContract.write;

export const isNonceError = (error: unknown): boolean => {
  const errorMessage = String(error).toLowerCase();
  return (
    errorMessage.includes("nonce too low") ||
    errorMessage.includes("nonce too high") ||
    errorMessage.includes("nonce conflict") ||
    errorMessage.includes("replacement transaction underpriced")
  );
};

export const getGasBalance = async (): Promise<GasInfo> => {
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
};

export const checkGasAvailability = async (
  estimatedGas: bigint,
): Promise<boolean> => {
  const { balance, gasPrice } = await getGasBalance();

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
};

export const executeWrite = async <T extends WritableFunctionName>(
  functionName: T,
  // @ts-ignore Type instantiation is excessively deep and possibly infinite
  args: Parameters<typeof worldContract.write[T]>[0],
  options: { gasBuffer?: number } = {},
): Promise<{ hash: Hex; receipt: TransactionReceipt }> => {
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
        simulationResult = await worldContract.simulate[functionName](
          // @ts-ignore Simulation is not typed
          args,
          {
            account: operatorAccount,
          },
        );
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
      await checkGasAvailability(estimatedGas);

      const nonce = await publicClient.getTransactionCount({
        address: operatorAccount.address,
        blockTag: "pending",
      });

      // @ts-ignore Write has too many unions
      const hash = await worldContract.write[functionName](args, {
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
};
