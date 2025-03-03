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

export const enqueueShamanJob = async (shamanId: Hex, cost: bigint) => {
  const shaman = await getShaman(shamanId);
  if (shaman.shamanBalance < cost) {
    throw new Error(
      `Shaman has insufficient balance: ${shamanId}, Balance: ${shaman.shamanBalance.toString()}, Cost: ${cost.toString()}`,
    );
  }

  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shamanId}`);
  }

  if (shaman.shamanState !== ShamanState.Idle) {
    throw new Error(`Shaman is not idle: ${shamanId}`);
  }

  await worldContract.simulate.enqueueShamanJob(
    [shamanId, cost],
    {
      account: operatorAccount.address,
    },
  );

  const hash = await worldContract.write.enqueueShamanJob(
    [shamanId, cost],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
};

export const startShamanJob = async (shamanId: Hex) => {
  const shaman = await getShaman(shamanId);

  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shamanId}`);
  }

  if (shaman.shamanState !== ShamanState.Queue) {
    throw new Error(`Shaman is not in queue: ${shamanId}`);
  }

  await worldContract.simulate.startShamanJob(
    [shamanId],
    {
      account: operatorAccount.address,
    },
  );

  const hash = await worldContract.write.startShamanJob(
    [shamanId],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
};

export const completeShamanJob = async (
  shamanId: Hex,
  cost: bigint,
  logMetadataHash: string,
  success: boolean,
) => {
  const shaman = await getShaman(shamanId);
  if (shaman.shamanBalance < cost) {
    throw new Error(
      `Shaman has insufficient balance: ${shamanId}, Balance: ${shaman.shamanBalance.toString()}, Cost: ${cost.toString()}`,
    );
  }

  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shamanId}`);
  }

  if (shaman.shamanState !== ShamanState.InProgress) {
    throw new Error(`Shaman is not in progress: ${shamanId}`);
  }

  await worldContract.simulate.completeShamanJob(
    [shamanId, cost, success, logMetadataHash],
    {
      account: operatorAccount.address,
    },
  );

  const hash = await worldContract.write.completeShamanJob(
    [shamanId, cost, success, logMetadataHash],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
};

export const executeShaman = async (shamanId: Hex) => {
  const shaman = await getShaman(shamanId);
  if (shaman.shamanState !== ShamanState.InProgress) {
    throw new Error(`Shaman is not in progress: ${shamanId}`);
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

  logger.info(`Uploading operation log to IPFS: ${JSON.stringify(result)}`);
  const { cid: logMetadataHash } = await upload(result);
  logger.info(`Operation log uploaded to IPFS: ${logMetadataHash}`);

  // Complete shaman
  logger.info(`Completing shaman: ${JSON.stringify(result)}`);
  const logHash = await completeShamanJob(
    shamanId,
    1n, // TODO: fetch cost from contract
    logMetadataHash,
    result.success,
  );
  logger.info(`Shaman completed: ${logHash}`);

  return result;
};

export const executeAbility = (
  ability: AbilityEntity,
  context: AbilityContext,
) => executeCode(ability.abilityMetadata.code, context);
