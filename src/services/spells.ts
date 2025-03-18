import { Hex } from "viem";
import { worldContract } from "../mud/contract.ts";
import { logger } from "../config/logger.ts";
import { SpellEntity, SpellMetadata } from "../types/spell.ts";
import { IPFS_GATEWAY } from "../config/env.ts";

export const getSpellName = (spellId: Hex) =>
  worldContract.read.getSpellName([spellId]);
export const getSpellMetadataHash = (spellId: Hex) =>
  worldContract.read.getSpellMetadata([spellId]);
export const getSpellCreator = (spellId: Hex) =>
  worldContract.read.getSpellCreator([spellId]);
export const getShamanSpellMetadataHash = (shamanId: Hex, spellId: Hex) =>
  worldContract.read.getShamanSpellMetadata([shamanId, spellId]);
export const getShamanSpellVersion = (shamanId: Hex, spellId: Hex) =>
  worldContract.read.getShamanSpellVersion([shamanId, spellId]);
export const getShamanSpellState = (shamanId: Hex, spellId: Hex) =>
  worldContract.read.getShamanSpellState([shamanId, spellId]);

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
  // Construct IPFS URL
  const ipfsUrl = `${IPFS_GATEWAY}${cid}`;
  logger.info(`Fetching metadata from IPFS: ${ipfsUrl}`);

  // Fetch and process the metadata
  const response = await fetch(ipfsUrl);
  if (!response.ok) {
    logger.error(`Failed to fetch metadata: ${response.status}`);
    throw new Error(`Failed to fetch metadata: ${response.status}`);
  }

  const metadata: SpellMetadata = await response.json();
  return metadata;
};
