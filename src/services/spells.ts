import { Hex } from "viem";
import { worldContract } from "../mud/contract.ts";
import { logger } from "../config/logger.ts";
import {
  ShamanSpellEntity,
  SpellContext,
  SpellEntity,
  SpellMetadata,
} from "../types/spell.ts";
import { IPFS_GATEWAY } from "../config/env.ts";
import { CodeExecutionResult, JobState } from "../types/common.ts";
import { executeCode } from "./codeExecutor.ts";
import { chain, operatorAccount, publicClient } from "./evm.ts";
import { ShamanEntity } from "../types/shaman.ts";

export const getSpellName = (spellId: Hex) =>
  worldContract.read.getSpellName([spellId]);
export const getSpellMetadataHash = (spellId: Hex) =>
  worldContract.read.getSpellMetadata([spellId]);
export const getSpellCreator = (spellId: Hex) =>
  worldContract.read.getSpellCreator([spellId]);

export const getSpell = async (spellId: Hex) => {
  logger.info(`Getting spell: ${spellId}`);
  const [spellName, spellCreator] = await Promise.all([
    getSpellName(spellId),
    getSpellCreator(spellId),
  ]);

  const spell = {
    spellId,
    spellName,
    spellCreator,
  } as SpellEntity;

  logger.info(`Fetched Spell: ${
    JSON.stringify({
      spellId,
      spellName,
      spellCreator,
    })
  }`);

  return spell;
};

export const getSpellMetadata = async (cid: string) => {
  const ipfsUrl = `${IPFS_GATEWAY}${cid}`;
  logger.info(`Fetching metadata from IPFS: ${ipfsUrl}`);

  const response = await fetch(ipfsUrl);
  if (!response.ok) {
    logger.error(`Failed to fetch metadata: ${response.status}`);
    throw new Error(`Failed to fetch metadata: ${response.status}`);
  }

  const metadata: SpellMetadata = await response.json();
  return metadata;
};

// blockchain actions

export const enqueueSpellJob = async (
  shaman: ShamanEntity,
  spell: ShamanSpellEntity,
  cost: bigint,
) => {
  if (shaman.shamanBalance < cost) {
    throw new Error(`Insufficient balance: ${shaman.shamanId} needs ${cost}`);
  }
  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }
  if (shaman.shamanState !== JobState.InProgress) {
    throw new Error(`Shaman must be InProgress: ${shaman.shamanId}`);
  }
  if (spell.spellState !== JobState.Idle) {
    throw new Error(`Spell must be Idle: ${spell.spellId}`);
  }

  await worldContract.simulate.enqueueSpellJob(
    [spell.shamanSpellId, cost],
    { account: operatorAccount },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
    blockTag: "pending",
  });

  const hash = await worldContract.write.enqueueSpellJob(
    [spell.shamanSpellId, cost],
    {
      chain,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });
  spell.spellState = JobState.Queue;

  logger.info(`Spell ${spell.spellId} transitioned to Queue (${hash})`);
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
    throw new Error(`Shaman must be InProgress: ${shaman.shamanId}`);
  }
  if (spell.spellState !== JobState.Queue) {
    throw new Error(`Spell must be Queue: ${spell.spellId}`);
  }

  await worldContract.simulate.startSpellJob(
    [spell.shamanSpellId],
    { account: operatorAccount },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
    blockTag: "pending",
  });

  const hash = await worldContract.write.startSpellJob(
    [spell.shamanSpellId],
    {
      chain,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });
  spell.spellState = JobState.InProgress;

  logger.info(`Spell ${spell.spellId} transitioned to InProgress (${hash})`);
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
    throw new Error(`Insufficient balance: ${shaman.shamanId} needs ${cost}`);
  }
  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }
  if (shaman.shamanState !== JobState.InProgress) {
    throw new Error(`Shaman must be InProgress: ${shaman.shamanId}`);
  }
  if (spell.spellState !== JobState.InProgress) {
    throw new Error(`Spell must be InProgress: ${spell.spellId}`);
  }

  await worldContract.simulate.completeSpellJob(
    [spell.shamanSpellId, cost, success, metadataHash],
    { account: operatorAccount },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
    blockTag: "pending",
  });

  const hash = await worldContract.write.completeSpellJob(
    [spell.shamanSpellId, cost, success, metadataHash],
    {
      chain,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });
  spell.spellState = JobState.Idle;

  logger.info(`Spell ${spell.spellId} completed and back to Idle (${hash})`);

  return hash;
};

export const executeSpell = (
  spell: ShamanSpellEntity,
  context: SpellContext,
): Promise<CodeExecutionResult> => {
  try {
    return executeCode(spell.spellMetadata.code, context);
  } catch (error) {
    logger.error(
      `Error executing spell ${spell.spellId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return Promise.resolve({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      result: null,
      timestamp: Date.now(),
    });
  }
};
