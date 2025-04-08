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
import { getSecrets } from "../services/secrets.ts";
import { PublicClient } from "viem";
import { getChainId } from "../utils/networks.ts";

export const publishSpellMessage = (message: SpellMessage) => {
  const { currentShamanSpellId } = message;
  logger.info(`Publishing spell message for spell Id: ${currentShamanSpellId}`);
  return publishSpell(message);
};

export const handleSpellMessage = async (msg: SpellMessage) => {
  const {
    shamanSpellPath,
    shamanId,
    currentShamanSpellId,
    nextShamanSpellIndex,
    results = [],
  } = msg;

  const shaman = await getShaman(shamanId);
  const shamanSpell = shamanSpellPath.find((s) =>
    s.shamanSpellId === currentShamanSpellId
  );

  if (!shamanSpell) {
    logger.error(`ShamanSpell not found: ${currentShamanSpellId}`);
    return;
  }

  logger.info(
    `Processing ShamanSpell: ${shamanSpell.shamanSpellId} (state: ${
      JobState[shamanSpell.spellState]
    })`,
  );

  try {
    // Handle based on current state
    if (shamanSpell.spellState === JobState.Idle) {
      // Transition Idle -> Queue
      await enqueueSpellJob(shaman, shamanSpell, 1n);
      // Re-publish to continue processing
      await publishSpellMessage(msg);
      return;
    }

    if (shamanSpell.spellState === JobState.Queue) {
      // Transition Queue -> InProgress
      await startSpellJob(shaman, shamanSpell);
      // Re-publish to continue processing
      await publishSpellMessage(msg);
      return;
    }

    if (shamanSpell.spellState === JobState.InProgress) {
      // Execute the spell
      const walletClient = new ServerWalletClient(
        shaman.shamanCreator,
        getChainId(shamanSpell.chain), // multiple chains are possible
      );

      // Get user secrets
      const secrets = await getSecrets(shamanSpell.spellCreator);

      // Create base context for spell execution
      const context = {
        spellCreator: shamanSpell.spellCreator,
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
        secrets,
        apiClient,
        oxApiClient,
        publicClient: publicClient as PublicClient,
        walletClient,
        viem,
      };
      const codeResult = await executeSpell(shamanSpell, context);

      // Upload results
      logger.info(
        `Uploading results for ShamanSpell: ${shamanSpell.shamanSpellId}`,
      );
      const { cid: metadataHash } = await upload(codeResult);

      // Complete on chain
      await completeSpellJob(
        shaman,
        shamanSpell,
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
        nextShamanSpellIndex === undefined ||
        nextShamanSpellIndex >= shamanSpellPath.length
      ) {
        await publishShamanMessage({
          shamanId,
          results: updatedResults,
          success: true,
        });
        return;
      }

      // Otherwise, chain to the next spell
      const nextSpell = shamanSpellPath[nextShamanSpellIndex];

      // Publish next spell
      await publishSpellMessage({
        shamanSpellPath,
        shamanId,
        currentShamanSpellId: nextSpell.shamanSpellId,
        nextShamanSpellIndex: nextShamanSpellIndex + 1,
        results: updatedResults,
      });
      return;
    }

    logger.warn(
      `ShamanSpell ${shamanSpell.shamanSpellId} is in unhandled state: ${
        JobState[shamanSpell.spellState]
      }`,
    );
  } catch (error) {
    logger.error(
      `Error processing ShamanSpell ${shamanSpell.shamanSpellId}: ${
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
