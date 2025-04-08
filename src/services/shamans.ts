import { Hex, zeroHash } from "viem";
import { logger } from "../config/logger.ts";
import { worldContract } from "../mud/contract.ts";
import { publishShamanMessage } from "../queues/shaman.ts";
import { publishSpellMessage } from "../queues/spell.ts";
import {
  CodeExecutionResult,
  JobState,
  ShamanExecutionResult,
} from "../types/common.ts";
import { SourceMessage } from "../types/queue.ts";
import { ShamanEntity } from "../types/shaman.ts";
import { Source, SourceIds } from "../types/source.ts";
import { ShamanSpellEdgeEntity, ShamanSpellEntity } from "../types/spell.ts";
import { chain, operatorAccount, publicClient } from "./evm.ts";
import { upload } from "./filebase.ts";
import { getSpell, getSpellMetadata } from "./spells.ts";

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
export const getShamanSpellEdges = (shamanId: Hex) =>
  worldContract.read.getShamanSpellEdges([shamanId]);
export const getShamanSpells = (shamanId: Hex) =>
  worldContract.read.getShamanSpells([shamanId]);

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
    shamanSpells,
    shamanSpellEdges,
  ] = await Promise.all([
    getShamanCreator(shamanId),
    getShamanBalance(shamanId),
    getShamanState(shamanId),
    getShamanActive(shamanId),
    getShamanSpellIds(shamanId),
    getShamanSourceIds(shamanId),
    getShamanSpells(shamanId),
    getShamanSpellEdges(shamanId),
  ]);

  const shamanSpellsEntities = await Promise.all(
    shamanSpells.map(async (shamanSpell) => {
      const spell = await getSpell(shamanSpell.spellId);
      const spellMetadata = await getSpellMetadata(shamanSpell.metadata);

      return {
        ...spell,
        spellMetadata,
        chain: shamanSpell.chain,
        shamanSpellId: shamanSpell.shamanSpellId,
        spellMetadataHash: shamanSpell.metadata,
        spellVersion: shamanSpell.version,
        spellState: shamanSpell.state,
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
    shamanSpells: shamanSpellsEntities,
    shamanSpellEdges: shamanSpellEdges?.map((edge) => ({
      ...edge,
    } as ShamanSpellEdgeEntity)),
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

  await worldContract.simulate.enqueueShamanJob([shaman.shamanId], {
    account: operatorAccount,
  });

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
    blockTag: "pending",
  });

  const hash = await worldContract.write.enqueueShamanJob([shaman.shamanId], {
    chain,
    account: operatorAccount,
    nonce,
  });

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

  await worldContract.simulate.startShamanJob([shaman.shamanId], {
    account: operatorAccount,
  });

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
    blockTag: "pending",
  });

  const hash = await worldContract.write.startShamanJob([shaman.shamanId], {
    chain,
    account: operatorAccount,
    nonce,
  });

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
    { account: operatorAccount },
  );

  const nonce = await publicClient.getTransactionCount({
    address: operatorAccount.address,
    blockTag: "pending",
  });

  const hash = await worldContract.write.completeShamanJob(
    [shaman.shamanId, success, metadataHash],
    {
      chain,
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

export const startSpellPathExecution = (shaman: ShamanEntity) => {
  const shamanSpellPath = buildSpellPath(shaman);
  // Get the first spell
  const firstShamanSpell = shamanSpellPath[0];

  // Publish spell message to begin execution
  const hasMoreSpells = shamanSpellPath.length > 1;
  return publishSpellMessage({
    shamanSpellPath,
    shamanId: shaman.shamanId,
    currentShamanSpellId: firstShamanSpell.shamanSpellId,
    nextShamanSpellIndex: hasMoreSpells ? 1 : undefined,
  });
};

// build edges path
// edges are defined with a fromSpellId and toSpellId
// we can see this as directed acyclic graph (DAG)
// https://en.wikipedia.org/wiki/Directed_acyclic_graph
// we need to build the topological sort of the DAG
// https://en.wikipedia.org/wiki/Topological_sorting

export const buildSpellPath = (shaman: ShamanEntity) => {
  // If there are no edges or only one spell, return spells in their current order
  if (!shaman.shamanSpellEdges || shaman.shamanSpellEdges.length === 0) {
    return shaman.shamanSpells;
  }

  // Create a map to store the graph (adjacency list)
  const graph = new Map<Hex, Hex[]>();
  // Track in-degree of each node for topological sort
  const inDegree = new Map<Hex, number>();

  // Initialize graph and in-degree for all spells
  for (const shamanSpell of shaman.shamanSpells) {
    graph.set(shamanSpell.shamanSpellId, []);
    inDegree.set(shamanSpell.shamanSpellId, 0);
  }

  // Helper function to check if a shaman spell id is valid
  const isNotEmpty = (shamanSpellId: Hex | undefined): shamanSpellId is Hex => {
    return !!shamanSpellId &&
      shamanSpellId !== "0x" &&
      shamanSpellId !== zeroHash;
  };

  // Build the graph and update in-degree
  for (const edge of shaman.shamanSpellEdges) {
    if (
      isNotEmpty(edge.fromShamanSpellId) && isNotEmpty(edge.toShamanSpellId)
    ) {
      // Add edge to graph
      const neighbors = graph.get(edge.fromShamanSpellId) || [];
      neighbors.push(edge.toShamanSpellId);
      graph.set(edge.fromShamanSpellId, neighbors);

      // Increment in-degree for destination
      inDegree.set(
        edge.toShamanSpellId,
        (inDegree.get(edge.toShamanSpellId) ?? 0) + 1,
      );
    }
  }

  // Find all nodes with in-degree 0 (starting points)
  const queue: Hex[] = [];
  for (const [shamanSpellId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(shamanSpellId);
    }
  }

  // Perform topological sort using BFS
  const topologicalOrder: Hex[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    topologicalOrder.push(current);

    // Decrease in-degree of all neighbors
    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);

      // If in-degree becomes 0, add to queue
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check if we've visited all spells (if not, there's a cycle)
  if (topologicalOrder.length !== shaman.shamanSpells.length) {
    throw new Error("Cycle detected in spell dependencies");
  }

  // Map spell IDs to actual spell objects and filter out any undefined values
  return topologicalOrder
    .map((shamanSpellId) =>
      shaman.shamanSpells.find((shamanSpell) =>
        shamanSpell.shamanSpellId === shamanSpellId
      )
    )
    .filter((shamanSpell): shamanSpell is ShamanSpellEntity =>
      shamanSpell !== undefined
    );
};
