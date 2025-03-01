import { Hex } from "viem";
import { worldContract } from "../mud/contract.ts";
import { logger } from "../config/logger.ts";
import { ShamanEntity, ShamanMetadata } from "../types/shaman.ts";
import { IPFS_GATEWAY } from "../config/env.ts";

export const getShamanName = (shamanId: Hex) =>
  worldContract.read.getShamanName([shamanId]);
export const getShamanMetadataHash = (shamanId: Hex) =>
  worldContract.read.getShamanMetadata([shamanId]);
export const getShamanCreator = (shamanId: Hex) =>
  worldContract.read.getShamanCreator([shamanId]);

export const getShaman = async (shamanId: Hex) => {
  logger.info(`Getting shaman: ${shamanId}`);
  const [shamanName, shamanMetadataHash, shamanCreator] = await Promise.all([
    getShamanName(shamanId),
    getShamanMetadataHash(shamanId),
    getShamanCreator(shamanId),
  ]);

  const shamanMetadata = await getShamanMetadata(shamanMetadataHash);

  const shaman = {
    shamanId,
    shamanName,
    shamanCreator,
    shamanMetadata,
  } as ShamanEntity;

  logger.info(`Fetched Shaman: ${
    JSON.stringify({
      shamanId,
      shamanName,
      shamanCreator,
    })
  }`);

  return shaman;
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
