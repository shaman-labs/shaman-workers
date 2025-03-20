import { arbitrumSepolia } from "viem/chains";
import * as viem from "viem";
import { logger } from "../config/logger.ts";
import { upload } from "../services/filebase.ts";
import { getShaman } from "../services/shamans.ts";
import {
  completeSpellJob,
  enqueueSpellJob,
  executeSpell,
  startSpellJob,
} from "../services/spells.ts";
import { JobState } from "../types/common.ts";
import { SpellMessage } from "../types/queue.ts";
import { publishSpell } from "./kv.ts";
import { publishShamanMessage } from "./shaman.ts";
import { ServerWalletClient } from "../services/privy.ts";
import { apiClient, oxApiClient } from "../services/api.ts";
import { publicClient } from "../services/evm.ts";

export const publishSpellMessage = (message: SpellMessage) => {
  const { spellId } = message;
  logger.info(`Publishing spell message for spell Id: ${spellId}`);
  return publishSpell(message);
};

export const handleSpellMessage = async (msg: SpellMessage) => {
  const { shamanId, spellId, nextSpellIndex, results = [] } = msg;

  const shaman = await getShaman(shamanId);
  const spell = shaman.shamanSpells.find((s) => s.spellId === spellId);

  if (!spell) {
    logger.error(`Spell not found: ${spellId}`);
    return;
  }

  logger.info(
    `Processing spell: ${spell.spellId} (state: ${JobState[spell.spellState]})`,
  );

  try {
    // Handle based on current state
    if (spell.spellState === JobState.Idle) {
      // Transition Idle -> Queue
      await enqueueSpellJob(shaman, spell, 1n);
      // Re-publish to continue processing
      await publishSpellMessage(msg);
      return;
    }

    if (spell.spellState === JobState.Queue) {
      // Transition Queue -> InProgress
      await startSpellJob(shaman, spell);
      // Re-publish to continue processing
      await publishSpellMessage(msg);
      return;
    }

    if (spell.spellState === JobState.InProgress) {
      // Execute the spell
      const walletClient = new ServerWalletClient(
        shaman.shamanCreator,
        arbitrumSepolia.id,
      );

      // Create base context for spell execution
      const context = {
        spellCreator: spell.spellCreator,
        shamanCreator: shaman.shamanCreator,
        previousResults: results // TODO: make this prettier
          ?.map((r) => r.result ?? {})
          ?.reduce(
            (acc: Record<string, unknown>, curr) => {
              if (typeof curr === "object" && curr !== null) {
                return { ...acc, ...curr };
              }
              return acc;
            },
            {},
          ),
        apiClient,
        oxApiClient,
        publicClient,
        walletClient,
        viem,
      };
      const codeResult = await executeSpell(spell, context);

      // Upload results
      logger.info(`Uploading results for spell: ${spell.spellId}`);
      const { cid: metadataHash } = await upload(codeResult);

      // Complete on chain
      await completeSpellJob(
        shaman,
        spell,
        metadataHash,
        codeResult.success,
        1n,
      );

      // Add this result to accumulated results
      const updatedResults = [...results, codeResult];

      // If the spell failed, complete the shaman with failure
      if (!codeResult.success) {
        await publishShamanMessage({
          shamanId,
          results: updatedResults,
          success: false,
        });
        return;
      }

      // If we're at the last spell, complete the shaman with success
      if (
        nextSpellIndex === undefined ||
        nextSpellIndex >= shaman.shamanSpells.length
      ) {
        await publishShamanMessage({
          shamanId,
          results: updatedResults,
          success: true,
        });
        return;
      }

      // Otherwise, chain to the next spell
      const nextSpell = shaman.shamanSpells[nextSpellIndex];

      // Publish next spell
      await publishSpellMessage({
        shamanId,
        spellId: nextSpell.spellId,
        nextSpellIndex: nextSpellIndex + 1,
        results: updatedResults,
      });
      return;
    }

    logger.warn(
      `Spell ${spell.spellId} is in unhandled state: ${
        JobState[spell.spellState]
      }`,
    );
  } catch (error) {
    logger.error(
      `Error processing spell ${spell.spellId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    // On error, try to complete the shaman with failure
    try {
      await publishShamanMessage({
        shamanId,
        results,
        success: false,
      });
    } catch (e) {
      logger.error(`Failed to publish shaman message after spell error: ${e}`);
    }
  }
};
