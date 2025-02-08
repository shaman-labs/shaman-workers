import {
  encodeFunctionData,
  formatEther,
  Hex,
  parseEther,
  parseUnits,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { worldContract } from "../mud/contract.ts";
import { logger } from "../config/logger.ts";
import {
  ShamanContext,
  ShamanEntity,
  ShamanMetadata,
} from "../types/shaman.ts";
import { IPFS_GATEWAY } from "../config/env.ts";
import { operatorAccount, publicClient } from "./evm.ts";
import { createServerClient } from "./privy.ts";
import { executeCode } from "./codeExecutor.ts";
import { uploadOperationLog } from "./filebase.ts";

export const getShamanActive = (shamanId: Hex) =>
  worldContract.read.getShamanActive([shamanId]);
export const getShamanBalance = (shamanId: Hex) =>
  worldContract.read.getShamanBalance([shamanId]);
export const getShamanMetadataHash = (shamanId: Hex) =>
  worldContract.read.getShamanMetadata([shamanId]);
export const getShamanCreator = (shamanId: Hex) =>
  worldContract.read.getShamanCreator([shamanId]);

export const getShaman = async (shamanId: Hex) => {
  logger.info(`Getting shaman: ${shamanId}`);
  const [shamanActive, shamanBalance, shamanMetadataHash, shamanCreator] =
    await Promise.all([
      getShamanActive(shamanId),
      getShamanBalance(shamanId),
      getShamanMetadataHash(shamanId),
      getShamanCreator(shamanId),
    ]);

  const shamanMetadata = await getShamanMetadata(shamanMetadataHash);
  logger.info(`Shaman metadata: ${JSON.stringify(shamanMetadata)}`);
  return {
    shamanId,
    shamanActive,
    shamanBalance,
    shamanMetadata,
    shamanCreator,
  } as ShamanEntity;
};

export const getShamanMetadata = async (cid: string) => {
  // Construct IPFS URL
  const ipfsUrl = `${IPFS_GATEWAY}${cid}`;
  logger.info(`Fetching metadata from IPFS: ${ipfsUrl}`);

  // Fetch and process the metadata
  const response = await fetch(ipfsUrl);
  if (!response.ok) {
    logger.error(`Failed to fetch metadata: ${response.status}`);
    throw new Error(`Failed to fetch metadata: ${response.status}`);
  }

  const metadata: ShamanMetadata = await response.json();
  return metadata;
};

export const logShamanOperation = async (
  shamanId: Hex,
  cost: bigint,
  logMetadataHash: string,
  success: boolean,
) => {
  await worldContract.simulate.logShamanOperation(
    [shamanId, cost, logMetadataHash, success],
    {
      account: operatorAccount.address,
    },
  );

  const hash = await worldContract.write.logShamanOperation(
    [shamanId, cost, logMetadataHash, success],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
    },
  );

  // TODO: use waitForTransactionReceipt
  return hash;
};

export const executeShaman = async (shamanId: Hex) => {
  const shaman = await getShaman(shamanId);
  if (!shaman.shamanActive) {
    throw new Error(`Shaman is not active: ${shamanId}`);
  }
  if (shaman.shamanBalance < 1n) {
    throw new Error(`Shaman has no balance: ${shamanId}`);
  }

  const serverClient = createServerClient(
    shaman.shamanCreator,
    shaman.shamanMetadata.chainId,
  );

  const context: ShamanContext = {
    ...shaman.shamanMetadata,
    fetch,
    publicClient,
    encodeFunctionData,
    parseEther,
    parseUnits,
    formatEther,
    walletClient: serverClient,
  };

  const result = await executeCode(shaman.shamanMetadata.code, context);

  logger.info(`Uploading operation log to IPFS: ${JSON.stringify(result)}`);
  const { cid: logMetadataHash } = await uploadOperationLog(result);
  logger.info(`Operation log uploaded to IPFS: ${logMetadataHash}`);

  // Log result to database
  logger.info(`Logging operation to database: ${JSON.stringify(result)}`);
  const logHash = await logShamanOperation(
    shamanId,
    shaman.shamanBalance,
    logMetadataHash,
    result.success,
  );
  logger.info(`Operation logged to database: ${logHash}`);

  return {
    ...result,
    logMetadataHash,
    logHash,
  };
};
