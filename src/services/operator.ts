import { Hex } from "viem";
import { operatorAccount, publicClient } from "./evm.ts";
import { logger } from "../config/logger.ts";
import { setTimeout } from "node:timers/promises";
import { ContractError, ContractErrorType } from "../types/evm.ts";
import { parseEther } from "viem";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;
const MIN_GAS_BUFFER = parseEther("0.00001");

export const checkOperatorBalance = async (): Promise<boolean> => {
  const balance = await publicClient.getBalance({
    address: operatorAccount.address,
  });

  if (balance <= MIN_GAS_BUFFER) {
    const error =
      `Insufficient gas: address ${operatorAccount.address} has ${balance} wei, needs at least ${MIN_GAS_BUFFER} wei`;
    logger.error(error);
    throw new ContractError(error, ContractErrorType.INSUFFICIENT_GAS, {
      balance,
      required: MIN_GAS_BUFFER,
    });
  }

  return true;
};

export const safeWrite = async (
  fn: () => Promise<{ hash: Hex }>,
): Promise<{ hash: Hex }> => {
  await checkOperatorBalance();

  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      attempts++;
      logger.info(
        `Executing contract write (attempt ${attempts}/${MAX_RETRIES})`,
      );

      const { hash } = await fn();

      return { hash };
    } catch (error) {
      logger.warn(`Error: ${String(error)}`);
      if (attempts >= MAX_RETRIES) {
        throw error;
      }
      logger.info(`Retrying in ${RETRY_DELAY_MS * attempts}ms`);

      await setTimeout(RETRY_DELAY_MS * attempts);
    }
  }

  throw new Error("Unexpected end of contract execution");
};
