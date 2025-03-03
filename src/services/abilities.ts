import { Hex } from "viem";
import { worldContract } from "../mud/contract.ts";
import { logger } from "../config/logger.ts";
import { AbilityEntity, AbilityMetadata } from "../types/ability.ts";
import { IPFS_GATEWAY } from "../config/env.ts";

export const getAbilityName = (abilityId: Hex) =>
  worldContract.read.getAbilityName([abilityId]);
export const getAbilityMetadataHash = (abilityId: Hex) =>
  worldContract.read.getAbilityMetadata([abilityId]);
export const getAbilityCreator = (abilityId: Hex) =>
  worldContract.read.getAbilityCreator([abilityId]);

export const getAbility = async (abilityId: Hex) => {
  logger.info(`Getting ability: ${abilityId}`);
  const [abilityName, abilityMetadataHash, abilityCreator] = await Promise.all([
    getAbilityName(abilityId),
    getAbilityMetadataHash(abilityId),
    getAbilityCreator(abilityId),
  ]);

  const abilityMetadata = await getAbilityMetadata(abilityMetadataHash);

  const ability = {
    abilityId,
    abilityName,
    abilityCreator,
    abilityMetadata,
  } as AbilityEntity;

  logger.info(`Fetched Ability: ${
    JSON.stringify({
      abilityId,
      abilityName,
      abilityCreator,
    })
  }`);

  return ability;
};

export const getAbilityMetadata = async (cid: string) => {
  // Construct IPFS URL
  const ipfsUrl = `${IPFS_GATEWAY}${cid}`;
  logger.info(`Fetching metadata from IPFS: ${ipfsUrl}`);

  // Fetch and process the metadata
  const response = await fetch(ipfsUrl);
  if (!response.ok) {
    logger.error(`Failed to fetch metadata: ${response.status}`);
    throw new Error(`Failed to fetch metadata: ${response.status}`);
  }

  const metadata: AbilityMetadata = await response.json();
  return metadata;
};
