import {
  encodeFunctionData,
  formatEther,
  Hex,
  parseEther,
  parseUnits,
  zeroAddress,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { logger } from "../config/logger.ts";
import { worldContract } from "../mud/contract.ts";
import { ShamanExecutionResult } from "../types/common.ts";
import { AbilityContext, AbilityEntity } from "../types/ability.ts";
import { ShamanEntity, ShamanState } from "../types/shaman.ts";
import { executeCode } from "./codeExecutor.ts";
import { operatorAccount, publicClient } from "./evm.ts";
import { upload } from "./filebase.ts";
import { ServerWalletClient } from "./privy.ts";
import { getAbility } from "./abilities.ts";

export const getShamanCreator = (shamanId: Hex) =>
  worldContract.read.getShamanCreator([shamanId]);
export const getShamanBalance = (shamanId: Hex) =>
  worldContract.read.getShamanBalance([shamanId]);
export const getShamanState = (shamanId: Hex) =>
  worldContract.read.getShamanState([shamanId]);
export const getShamanActive = (shamanId: Hex) =>
  worldContract.read.getShamanActive([shamanId]);
export const getShamanAbilityIds = (shamanId: Hex) =>
  worldContract.read.getShamanAbilityIds([shamanId]);
export const getShamanSourceIds = (shamanId: Hex) =>
  worldContract.read.getShamanSourceIds([shamanId]);
export const getShamanIdsBySourceId = (sourceId: Hex) =>
  worldContract.read.getShamanIdsBySourceId([sourceId]);

export const getShamansBySourceId = async (sourceId: Hex) => {
  // TODO: consider pagination
  const shamanIds = await getShamanIdsBySourceId(sourceId);
  return Promise.all(shamanIds.map(getShaman));
};

export const getShaman = async (shamanId: Hex) => {
  logger.info(`Getting shaman: ${shamanId}`);
  const [
    shamanCreator,
    shamanBalance,
    shamanState,
    shamanActive,
    shamanAbilityIds,
    shamanSourceIds,
  ] = await Promise.all([
    getShamanCreator(shamanId),
    getShamanBalance(shamanId),
    getShamanState(shamanId),
    getShamanActive(shamanId),
    getShamanAbilityIds(shamanId),
    getShamanSourceIds(shamanId),
  ]);

  const shamanAbilities = await Promise.all(
    shamanAbilityIds.map((abilityId) => getAbility(abilityId)),
  );

  const shaman = {
    shamanId,
    shamanCreator,
    shamanBalance,
    shamanState,
    shamanActive,
    shamanAbilityIds,
    shamanSourceIds,
    shamanAbilities,
  } as ShamanEntity;

  logger.info(`Fetched Shaman: ${
    JSON.stringify({
      shamanId,
      shamanBalance: shamanBalance.toString(),
      shamanState: shamanState,
      shamanActive: shamanActive,
      shamanCreator: shamanCreator,
    })
  }`);

  return shaman;
};

export const enqueueShamanJob = async (shaman: ShamanEntity, cost: bigint) => {
  if (shaman.shamanBalance < cost) {
    throw new Error(
      `Shaman has insufficient balance: ${shaman.shamanId}, Balance: ${shaman.shamanBalance.toString()}, Cost: ${cost.toString()}`,
    );
  }

  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }

  if (shaman.shamanState !== ShamanState.Idle) {
    throw new Error(`Shaman is not idle: ${shaman.shamanId}`);
  }

  await worldContract.simulate.enqueueShamanJob(
    [shaman.shamanId, cost],
    {
      account: operatorAccount.address,
    },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  logger.info(`Using nonce ${nonce} for enqueueShamanJob transaction`);

  const hash = await worldContract.write.enqueueShamanJob(
    [shaman.shamanId, cost],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  // mark shaman instance as enqueued
  shaman.shamanState = ShamanState.Queue;

  return hash;
};

export const startShamanJob = async (shaman: ShamanEntity) => {
  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }

  if (shaman.shamanState !== ShamanState.Queue) {
    throw new Error(`Shaman is not in queue: ${shaman.shamanId}`);
  }

  await worldContract.simulate.startShamanJob(
    [shaman.shamanId],
    {
      account: operatorAccount.address,
    },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  logger.info(`Using nonce ${nonce} for startShamanJob transaction`);

  const hash = await worldContract.write.startShamanJob(
    [shaman.shamanId],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce: nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  // mark shaman instance as in progress
  shaman.shamanState = ShamanState.InProgress;

  return hash;
};

export const completeShamanJob = async (
  shaman: ShamanEntity,
  cost: bigint,
  metadataHash: string,
  success: boolean,
) => {
  if (shaman.shamanBalance < cost) {
    throw new Error(
      `Shaman has insufficient balance: ${shaman.shamanId}, Balance: ${shaman.shamanBalance.toString()}, Cost: ${cost.toString()}`,
    );
  }

  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }

  if (shaman.shamanState !== ShamanState.InProgress) {
    throw new Error(`Shaman is not in progress: ${shaman.shamanId}`);
  }

  await worldContract.simulate.completeShamanJob(
    [shaman.shamanId, cost, success, metadataHash],
    {
      account: operatorAccount.address,
    },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  logger.info(`Using nonce ${nonce} for completeShamanJob transaction`);

  const hash = await worldContract.write.completeShamanJob(
    [shaman.shamanId, cost, success, metadataHash],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  // mark shaman instance as Idle after completion
  shaman.shamanState = ShamanState.Idle;

  return hash;
};

export const processShamanJob = async (
  shaman: ShamanEntity,
  cost: bigint,
): Promise<ShamanExecutionResult | null> => {
  try {
    switch (shaman.shamanState) {
      case ShamanState.Idle:
        await enqueueShamanJob(shaman, cost);
        await startShamanJob(shaman);
        return executeShaman(shaman);
      case ShamanState.Queue:
        await startShamanJob(shaman);
        return executeShaman(shaman);
      case ShamanState.InProgress:
        return executeShaman(shaman);
      case ShamanState.Completed:
        logger.warn(`Shaman ${shaman.shamanId} is already completed`);
        return null;
      default:
        logger.warn(
          `Shaman ${shaman.shamanId} is in an invalid state: ${shaman.shamanState}`,
        );
        return null;
    }
  } catch (error) {
    logger.error(
      `Error processing shaman job ${shaman.shamanId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
};

export const processShamansBySourceId = async (sourceId: Hex) => {
  // TODO: this will break on large numbers of shamanIds
  const shamans = await getShamansBySourceId(sourceId);
  const jobs = shamans.map((shaman) => processShamanJob(shaman, 1n));
  return Promise.all(jobs);
};

export const executeShaman = async (shaman: ShamanEntity) => {
  if (shaman.shamanState !== ShamanState.InProgress) {
    throw new Error(`Shaman is not in progress: ${shaman.shamanId}`);
  }
  const walletClient = new ServerWalletClient(
    shaman.shamanCreator,
    arbitrumSepolia.id,
  );

  const result: ShamanExecutionResult = {
    success: false,
    results: [],
  };

  // execute each ability in order
  let context: AbilityContext = {
    abilityCreator: zeroAddress,
    shamanCreator: shaman.shamanCreator,
    fetch,
    publicClient,
    walletClient,
    encodeFunctionData,
    parseEther,
    parseUnits,
    formatEther,
  };
  for (const ability of shaman.shamanAbilities) {
    // add ability creator to context
    context = {
      ...context,
      abilityCreator: ability.abilityCreator,
    };
    const codeResult = await executeAbility(ability, context);
    logger.info(
      `Ability ${ability.abilityId} executed, success: ${codeResult.success}`,
    );

    result.results.push(codeResult);
    result.success = codeResult.success;
    if (!codeResult.success) {
      break;
    }

    // chain next result
    context = {
      ...context,
      previousResults: codeResult.result,
    };
  }

  logger.info("Uploading operation log to IPFS");
  const { cid: metadataHash } = await upload(result);
  logger.info(`Operation log uploaded to IPFS: ${metadataHash}`);

  // Complete shaman
  logger.info(`Completing shaman: ${shaman.shamanId}`);
  const logHash = await completeShamanJob(
    shaman,
    1n, // TODO: fetch cost from contract
    metadataHash,
    result.success,
  );
  logger.info(`Shaman completed: ${logHash}`);

  return result;
};

export const executeAbility = (
  ability: AbilityEntity,
  context: AbilityContext,
) => executeCode(ability.abilityMetadata.code, context);
