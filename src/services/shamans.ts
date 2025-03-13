import { Hex, zeroAddress } from "viem";
import * as viem from "viem";
import { arbitrumSepolia } from "viem/chains";
import { logger } from "../config/logger.ts";
import { worldContract } from "../mud/contract.ts";
import {
  CodeExecutionResult,
  JobState,
  ShamanExecutionResult,
} from "../types/common.ts";
import { ShamanSpellEntity, SpellContext } from "../types/spell.ts";
import { ShamanEntity } from "../types/shaman.ts";
import { executeCode } from "./codeExecutor.ts";
import { operatorAccount, publicClient } from "./evm.ts";
import { upload } from "./filebase.ts";
import { ServerWalletClient } from "./privy.ts";
import {
  getShamanSpellMetadataHash,
  getShamanSpellState,
  getShamanSpellVersion,
  getSpell,
} from "./spells.ts";
import { apiClient, oxApiClient } from "./api.ts";

export const getShamanCreator = (shamanId: Hex) =>
  worldContract.read.getShamanCreator([shamanId]);
export const getShamanBalance = (shamanId: Hex) =>
  worldContract.read.getShamanBalance([shamanId]);
export const getShamanState = (shamanId: Hex) =>
  worldContract.read.getShamanState([shamanId]);
export const getShamanActive = (shamanId: Hex) =>
  worldContract.read.getShamanActive([shamanId]);
export const getShamanSpellIds = (shamanId: Hex) =>
  worldContract.read.getShamanSpellIds([shamanId]);
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
    shamanSpellIds,
    shamanSourceIds,
  ] = await Promise.all([
    getShamanCreator(shamanId),
    getShamanBalance(shamanId),
    getShamanState(shamanId),
    getShamanActive(shamanId),
    getShamanSpellIds(shamanId),
    getShamanSourceIds(shamanId),
  ]);

  const shamanSpells = await Promise.all(
    shamanSpellIds.map(async (spellId) => {
      const spell = await getSpell(spellId);
      const spellMetadataHash = await getShamanSpellMetadataHash(
        shamanId,
        spellId,
      );
      const spellVersion = await getShamanSpellVersion(shamanId, spellId);
      const spellState = await getShamanSpellState(shamanId, spellId);
      return {
        ...spell,
        spellMetadataHash,
        spellVersion,
        spellState,
      } as ShamanSpellEntity;
    }),
  );

  const shaman = {
    shamanId,
    shamanCreator,
    shamanBalance,
    shamanState,
    shamanActive,
    shamanSpellIds,
    shamanSourceIds,
    shamanSpells,
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

export const enqueueShamanJob = async (shaman: ShamanEntity) => {
  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }

  if (shaman.shamanState !== JobState.Idle) {
    throw new Error(`Shaman is not idle: ${shaman.shamanId}`);
  }

  await worldContract.simulate.enqueueShamanJob(
    [shaman.shamanId],
    {
      account: operatorAccount.address,
    },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  logger.info(`Using nonce ${nonce} for enqueueShamanJob transaction`);

  const hash = await worldContract.write.enqueueShamanJob(
    [shaman.shamanId],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  // mark shaman instance as enqueued
  shaman.shamanState = JobState.Queue;

  return hash;
};

export const startShamanJob = async (shaman: ShamanEntity) => {
  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }

  if (shaman.shamanState !== JobState.Queue) {
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
  shaman.shamanState = JobState.InProgress;

  return hash;
};

export const completeShamanJob = async (
  shaman: ShamanEntity,
  metadataHash: string,
  success: boolean,
) => {
  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }

  if (shaman.shamanState !== JobState.InProgress) {
    throw new Error(`Shaman is not in progress: ${shaman.shamanId}`);
  }

  await worldContract.simulate.completeShamanJob(
    [shaman.shamanId, success, metadataHash],
    {
      account: operatorAccount.address,
    },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  logger.info(`Using nonce ${nonce} for completeShamanJob transaction`);

  const hash = await worldContract.write.completeShamanJob(
    [shaman.shamanId, success, metadataHash],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  // mark shaman instance as Idle after completion
  shaman.shamanState = JobState.Idle;

  return hash;
};

export const processShamanJob = async (
  shaman: ShamanEntity,
): Promise<ShamanExecutionResult | null> => {
  try {
    switch (shaman.shamanState) {
      case JobState.Idle:
        await enqueueShamanJob(shaman);
        await startShamanJob(shaman);
        return executeShaman(shaman);
      case JobState.Queue:
        await startShamanJob(shaman);
        return executeShaman(shaman);
      case JobState.InProgress:
        return executeShaman(shaman);
      case JobState.Completed:
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
  const jobs = shamans.map((shaman) => processShamanJob(shaman));
  return Promise.all(jobs);
};

export const enqueueSpellJob = async (
  shaman: ShamanEntity,
  spell: ShamanSpellEntity,
  cost: bigint,
) => {
  if (shaman.shamanBalance < cost) {
    throw new Error(
      `Shaman has insufficient balance: ${shaman.shamanId}, Balance: ${shaman.shamanBalance.toString()}, Cost: ${cost.toString()}`,
    );
  }

  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }

  if (shaman.shamanState !== JobState.InProgress) {
    throw new Error(`Shaman is not in progress: ${shaman.shamanId}`);
  }

  if (spell.spellState !== JobState.Idle) {
    throw new Error(`Spell is not idle: ${spell.spellId}`);
  }

  await worldContract.simulate.enqueueSpellJob(
    [shaman.shamanId, spell.spellId, cost],
    {
      account: operatorAccount.address,
    },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  logger.info(`Using nonce ${nonce} for enqueueSpellJob transaction`);

  const hash = await worldContract.write.enqueueSpellJob(
    [shaman.shamanId, spell.spellId, cost],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  // mark spell instance as in progress
  spell.spellState = JobState.Queue;
  return hash;
};

export const startSpellJob = async (
  shaman: ShamanEntity,
  spell: ShamanSpellEntity,
) => {
  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }

  if (shaman.shamanState !== JobState.InProgress) {
    throw new Error(`Shaman is not in progress: ${shaman.shamanId}`);
  }

  if (spell.spellState !== JobState.Queue) {
    throw new Error(`Spell is not in queue: ${spell.spellId}`);
  }

  await worldContract.simulate.startSpellJob(
    [shaman.shamanId, spell.spellId],
    {
      account: operatorAccount.address,
    },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  logger.info(`Using nonce ${nonce} for startSpellJob transaction`);

  const hash = await worldContract.write.startSpellJob(
    [shaman.shamanId, spell.spellId],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  // mark spell instance as in progress
  spell.spellState = JobState.InProgress;
  return hash;
};

export const completeSpellJob = async (
  shaman: ShamanEntity,
  spell: ShamanSpellEntity,
  metadataHash: string,
  success: boolean,
  cost: bigint,
) => {
  if (shaman.shamanBalance < cost) {
    throw new Error(
      `Shaman has insufficient balance: ${shaman.shamanId}, Balance: ${shaman.shamanBalance.toString()}, Cost: ${cost.toString()}`,
    );
  }

  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }

  if (shaman.shamanState !== JobState.InProgress) {
    throw new Error(`Shaman is not in progress: ${shaman.shamanId}`);
  }

  if (spell.spellState !== JobState.InProgress) {
    throw new Error(`Spell is not in progress: ${spell.spellId}`);
  }

  await worldContract.simulate.completeSpellJob(
    [shaman.shamanId, spell.spellId, cost, success, metadataHash],
    {
      account: operatorAccount.address,
    },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  logger.info(`Using nonce ${nonce} for completeSpellJob transaction`);

  const hash = await worldContract.write.completeSpellJob(
    [shaman.shamanId, spell.spellId, cost, success, metadataHash],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  // mark spell instance as idle after completion
  spell.spellState = JobState.Idle;

  return hash;
};

export const processSpellJob = async (
  shaman: ShamanEntity,
  spell: ShamanSpellEntity,
  context: SpellContext,
): Promise<CodeExecutionResult | null> => {
  try {
    switch (spell.spellState) {
      case JobState.Idle:
        await enqueueSpellJob(shaman, spell, 1n);
        await startSpellJob(shaman, spell);
        return executeSpell(spell, context);
      case JobState.Queue:
        await startSpellJob(shaman, spell);
        return executeSpell(spell, context);
      case JobState.InProgress:
        return executeSpell(spell, context);
      case JobState.Completed:
        logger.warn(`Spell ${spell.spellId} is already completed`);
        return null;
      default:
        logger.warn(
          `Spell ${spell.spellId} is in an invalid state: ${spell.spellState}`,
        );
        return null;
    }
  } catch (error) {
    logger.error(
      `Error processing spell job ${spell.spellId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
};

export const executeShaman = async (shaman: ShamanEntity) => {
  if (shaman.shamanState !== JobState.InProgress) {
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

  // execute each spell in order
  let context: SpellContext = {
    spellCreator: zeroAddress,
    shamanCreator: shaman.shamanCreator,
    apiClient,
    oxApiClient,
    publicClient,
    walletClient,
    viem,
  };
  for (const spell of shaman.shamanSpells) {
    // add spell creator to context
    context = {
      ...context,
      spellCreator: spell.spellCreator,
    };

    const codeResult = await processSpellJob(shaman, spell, context);
    if (!codeResult) {
      logger.error(`Spell ${spell.spellId} failed to execute`);
      break;
    }

    logger.info(
      `Spell ${spell.spellId} executed, success: ${codeResult.success}`,
    );

    logger.info("Uploading operation log to IPFS");
    const { cid: metadataHash } = await upload(codeResult);
    logger.info(`Operation log uploaded to IPFS: ${metadataHash}`);

    // Complete spell
    logger.info(`Completing spell: ${spell.spellId}`);
    const logHash = await completeSpellJob(
      shaman,
      spell,
      metadataHash,
      codeResult.success,
      1n,
    );

    logger.info(`Spell ${spell.spellId} completed: ${logHash}`);

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
    metadataHash,
    result.success,
  );
  logger.info(`Shaman completed: ${logHash}`);

  return result;
};

export const executeSpell = (
  spell: ShamanSpellEntity,
  context: SpellContext,
) => executeCode(spell.spellMetadata.code, context);
