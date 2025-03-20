import { logger } from "../config/logger.ts";
import {
  completeShamanJob,
  enqueueShamanJob,
  getShaman,
  startShamanJob,
  startSpellChain,
} from "../services/shamans.ts";
import { JobState } from "../types/common.ts";
import { ShamanMessage } from "../types/queue.ts";
import { publishShaman } from "./kv.ts";

export const publishShamanMessage = (
  msg: ShamanMessage,
) => {
  const { shamanId } = msg;
  logger.info(`Publishing shaman message for shaman Id: ${shamanId}`);
  return publishShaman(msg);
};

export const handleShamanMessage = async (msg: ShamanMessage) => {
  const { shamanId, results = [], success } = msg;

  const shaman = await getShaman(shamanId);

  logger.info(
    `Processing shaman: ${shaman.shamanId} (state: ${
      JobState[shaman.shamanState]
    })`,
  );

  try {
    // Handle based on current state
    if (shaman.shamanState === JobState.Idle) {
      // Transition Idle -> Queue
      await enqueueShamanJob(shaman);
      // Re-publish to continue processing
      await publishShamanMessage(msg);
      return;
    }

    if (shaman.shamanState === JobState.Queue) {
      // Transition Queue -> InProgress
      await startShamanJob(shaman);
      // Re-publish to continue processing
      await publishShamanMessage(msg);
      return;
    }

    if (shaman.shamanState === JobState.InProgress) {
      // If we have no spells, immediately complete
      if (!shaman.shamanSpells.length) {
        logger.info(
          `Shaman ${shaman.shamanId} has no spells - completing immediately`,
        );
        await completeShamanJob(shaman, results, success);
        return;
      }

      // If success is false, immediately complete
      if (!success) {
        logger.info(
          `Shaman ${shaman.shamanId} failed - completing immediately`,
        );
        await completeShamanJob(shaman, results, success);
        return;
      }

      // If all spells are complete, immediately complete
      if (results.length === shaman.shamanSpells.length) {
        logger.info(
          `Shaman ${shaman.shamanId} all spells complete - completing immediately`,
        );
        await completeShamanJob(shaman, results, success);
        return;
      }

      // Otherwise, start the spell chain
      logger.info(`Starting spell chain for shaman ${shaman.shamanId}`);
      await startSpellChain(shaman);
      return;
    }

    logger.warn(
      `Shaman ${shaman.shamanId} is in unhandled state: ${
        JobState[shaman.shamanState]
      }`,
    );
  } catch (error) {
    logger.error(
      `Error processing shaman ${shaman.shamanId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};
