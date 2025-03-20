import * as viem from "viem";
import { Hex, zeroAddress } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { logger } from "../config/logger.ts";
import { worldContract } from "../mud/contract.ts";
import {
  CodeExecutionResult,
  JobState,
  ShamanExecutionResult,
} from "../types/common.ts";
import { ShamanEntity } from "../types/shaman.ts";
import { Source, SourceIds } from "../types/source.ts";
import { ShamanSpellEntity } from "../types/spell.ts";
import { apiClient, oxApiClient } from "./api.ts";
import { operatorAccount, publicClient } from "./evm.ts";
import { ServerWalletClient } from "./privy.ts";
import {
  getShamanSpellMetadataHash,
  getShamanSpellState,
  getShamanSpellVersion,
  getSpell,
  getSpellMetadata,
} from "./spells.ts";
import { upload } from "./filebase.ts";
import { publishShamanMessage } from "../queues/shaman.ts";
import { publishSpellMessage } from "../queues/spell.ts";
import { SourceMessage } from "../types/queue.ts";

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
  const shamanIds = await getShamanIdsBySourceId(sourceId);
  return Promise.all(shamanIds.map(getShaman));
};

export const getShaman = async (shamanId: Hex) => {
  logger.info(`Fetching shaman data: ${shamanId}`);

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
      const spellMetadata = await getSpellMetadata(spellMetadataHash);
      const spellVersion = await getShamanSpellVersion(shamanId, spellId);
      const spellState = await getShamanSpellState(shamanId, spellId);

      return {
        ...spell,
        spellMetadata,
        spellMetadataHash,
        spellVersion,
        spellState,
      } as ShamanSpellEntity;
    }),
  );

  return {
    shamanId,
    shamanCreator,
    shamanBalance,
    shamanState,
    shamanActive,
    shamanSpellIds,
    shamanSourceIds,
    shamanSpells,
  } as ShamanEntity;
};

// blockchain actions
export const enqueueShamanJob = async (shaman: ShamanEntity) => {
  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }
  if (shaman.shamanState !== JobState.Idle) {
    throw new Error(`Shaman is not idle: ${shaman.shamanId}`);
  }

  await worldContract.simulate.enqueueShamanJob(
    [shaman.shamanId],
    { account: operatorAccount.address },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  const hash = await worldContract.write.enqueueShamanJob(
    [shaman.shamanId],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });
  shaman.shamanState = JobState.Queue;

  logger.info(`Shaman ${shaman.shamanId} transitioned to Queue (${hash})`);
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
    { account: operatorAccount.address },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  const hash = await worldContract.write.startShamanJob(
    [shaman.shamanId],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });
  shaman.shamanState = JobState.InProgress;

  logger.info(`Shaman ${shaman.shamanId} transitioned to InProgress (${hash})`);
  return hash;
};

export const completeShamanJob = async (
  shaman: ShamanEntity,
  results: CodeExecutionResult[],
  success: boolean,
) => {
  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shaman.shamanId}`);
  }
  if (shaman.shamanState !== JobState.InProgress) {
    throw new Error(`Shaman is not in progress: ${shaman.shamanId}`);
  }

  // Create result object
  const result: ShamanExecutionResult = { success, results };

  // Upload to IPFS
  logger.info(`Storing results for shaman: ${shaman.shamanId}`);
  const { cid: metadataHash } = await upload(result);
  logger.info(`Results stored with CID: ${metadataHash}`);

  // Complete on-chain
  await worldContract.simulate.completeShamanJob(
    [shaman.shamanId, success, metadataHash],
    { account: operatorAccount.address },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
  });

  const hash = await worldContract.write.completeShamanJob(
    [shaman.shamanId, success, metadataHash],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
      nonce,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });
  shaman.shamanState = JobState.Idle;

  logger.info(`Shaman ${shaman.shamanId} completed and back to Idle (${hash})`);
  return hash;
};

// utils
export const processShamansBySource = async (
  msg: SourceMessage,
): Promise<void> => {
  try {
    const isManualSource = msg.sourceId === SourceIds[Source.MANUAL];
    const shamanId = isManualSource ? (msg.context["shamanId"] as Hex) : null;

    if (isManualSource && !shamanId) {
      logger.error("Manual source requires a shamanId");
      return;
    }

    // Get shamans to process
    const shamans = isManualSource
      ? [await getShaman(shamanId!)]
      : await getShamansBySourceId(msg.sourceId);

    // Process all shamans in parallel
    logger.info(
      `Processing ${shamans.length} shamans for source ${msg.sourceId}`,
    );
    shamans.map((shaman) =>
      publishShamanMessage({
        shamanId: shaman.shamanId,
        results: [],
        success: true,
      })
    );
  } catch (error) {
    logger.error(
      `Error with source ${msg.sourceId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

export const startSpellChain = (shaman: ShamanEntity) => {
  // Create wallet client
  const walletClient = new ServerWalletClient(
    shaman.shamanCreator,
    arbitrumSepolia.id,
  );

  // Create base context for spell execution
  const baseContext = {
    spellCreator: zeroAddress,
    shamanCreator: shaman.shamanCreator,
    apiClient,
    oxApiClient,
    publicClient,
    walletClient,
    viem,
  };

  // Get the first spell
  const firstSpell = shaman.shamanSpells[0];

  // Add spell-specific context
  const spellContext = {
    ...baseContext,
    spellCreator: firstSpell.spellCreator,
  };

  // Publish spell message to begin execution
  const hasMoreSpells = shaman.shamanSpells.length > 1;
  return publishSpellMessage({
    shamanId: shaman.shamanId,
    spellId: firstSpell.spellId,
    context: spellContext,
    nextSpellIndex: hasMoreSpells ? 1 : undefined,
  });
};
