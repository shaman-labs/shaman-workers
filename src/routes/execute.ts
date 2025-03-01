import { Hono } from "@hono/hono";
import { isHex } from "viem";
import { logger } from "../config/logger.ts";
import {
  enqueueWorkflowJob,
  executeWorkflow,
  startWorkflowJob,
} from "../services/workflows.ts";
import { WorkflowRequest } from "../types/common.ts";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body: WorkflowRequest = await c.req.json();

    if (!body.workflowId || !isHex(body.workflowId)) {
      logger.warn("Missing workflowId in request");
      return c.json({ error: "Missing workflowId in request body" }, 400);
    }

    // enqueue workflow job
    await enqueueWorkflowJob(body.workflowId, 1n);
    // start workflow job
    await startWorkflowJob(body.workflowId);

    // execute workflow
    const executionResult = await executeWorkflow(body.workflowId);

    return c.json(executionResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing request: ${message}`);

    return c.json({ error: message }, 500);
  }
});

export default app;
