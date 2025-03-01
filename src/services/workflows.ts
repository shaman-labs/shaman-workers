import {
  encodeFunctionData,
  formatEther,
  Hex,
  parseEther,
  parseUnits,
  zeroAddress,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { logger } from "../config/logger.ts";
import { worldContract } from "../mud/contract.ts";
import { WorkflowExecutionResult } from "../types/common.ts";
import { ShamanContext, ShamanEntity } from "../types/shaman.ts";
import { WorkflowEntity, WorkflowState } from "../types/workflow.ts";
import { executeCode } from "./codeExecutor.ts";
import { operatorAccount, publicClient } from "./evm.ts";
import { upload } from "./filebase.ts";
import { ServerWalletClient } from "./privy.ts";
import { getShaman } from "./shamans.ts";

export const getWorkflowCreator = (workflowId: Hex) =>
  worldContract.read.getWorkflowCreator([workflowId]);
export const getWorkflowBalance = (workflowId: Hex) =>
  worldContract.read.getWorkflowBalance([workflowId]);
export const getWorkflowState = (workflowId: Hex) =>
  worldContract.read.getWorkflowState([workflowId]);
export const getWorkflowActive = (workflowId: Hex) =>
  worldContract.read.getWorkflowActive([workflowId]);
export const getWorkflowShamanIds = (workflowId: Hex) =>
  worldContract.read.getWorkflowShamanIds([workflowId]);
export const getWorkflowSourceIds = (workflowId: Hex) =>
  worldContract.read.getWorkflowSourceIds([workflowId]);

export const getWorkflow = async (workflowId: Hex) => {
  logger.info(`Getting workflow: ${workflowId}`);
  const [
    workflowCreator,
    workflowBalance,
    workflowState,
    workflowActive,
    workflowShamanIds,
    workflowSourceIds,
  ] = await Promise.all([
    getWorkflowCreator(workflowId),
    getWorkflowBalance(workflowId),
    getWorkflowState(workflowId),
    getWorkflowActive(workflowId),
    getWorkflowShamanIds(workflowId),
    getWorkflowSourceIds(workflowId),
  ]);

  const workflowShamans = await Promise.all(
    workflowShamanIds.map((shamanId) => getShaman(shamanId)),
  );

  const workflow = {
    workflowId,
    workflowCreator,
    workflowBalance,
    workflowState,
    workflowActive,
    workflowShamanIds,
    workflowSourceIds,
    workflowShamans,
  } as WorkflowEntity;

  logger.info(`Fetched Workflow: ${
    JSON.stringify({
      workflowId,
      workflowBalance: workflowBalance.toString(),
      workflowState: workflowState,
      workflowActive: workflowActive,
      workflowCreator: workflowCreator,
    })
  }`);

  return workflow;
};

export const enqueueWorkflowJob = async (workflowId: Hex, cost: bigint) => {
  const workflow = await getWorkflow(workflowId);
  if (workflow.workflowBalance < cost) {
    throw new Error(
      `Workflow has insufficient balance: ${workflowId}, Balance: ${workflow.workflowBalance.toString()}, Cost: ${cost.toString()}`,
    );
  }

  if (!workflow.workflowActive) {
    throw new Error(`Workflow is not active: ${workflowId}`);
  }

  if (workflow.workflowState !== WorkflowState.Idle) {
    throw new Error(`Workflow is not idle: ${workflowId}`);
  }

  await worldContract.simulate.enqueueWorkflowJob(
    [workflowId, cost],
    {
      account: operatorAccount.address,
    },
  );

  const hash = await worldContract.write.enqueueWorkflowJob(
    [workflowId, cost],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
};

export const startWorkflowJob = async (workflowId: Hex) => {
  const workflow = await getWorkflow(workflowId);

  if (!workflow.workflowActive) {
    throw new Error(`Workflow is not active: ${workflowId}`);
  }

  if (workflow.workflowState !== WorkflowState.Queue) {
    throw new Error(`Workflow is not in queue: ${workflowId}`);
  }

  await worldContract.simulate.startWorkflowJob(
    [workflowId],
    {
      account: operatorAccount.address,
    },
  );

  const hash = await worldContract.write.startWorkflowJob(
    [workflowId],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
};

export const completeWorkflowJob = async (
  workflowId: Hex,
  cost: bigint,
  logMetadataHash: string,
  success: boolean,
) => {
  const workflow = await getWorkflow(workflowId);
  if (workflow.workflowBalance < cost) {
    throw new Error(
      `Workflow has insufficient balance: ${workflowId}, Balance: ${workflow.workflowBalance.toString()}, Cost: ${cost.toString()}`,
    );
  }

  if (!workflow.workflowActive) {
    throw new Error(`Workflow is not active: ${workflowId}`);
  }

  if (workflow.workflowState !== WorkflowState.InProgress) {
    throw new Error(`Workflow is not in progress: ${workflowId}`);
  }

  await worldContract.simulate.completeWorkflowJob(
    [workflowId, cost, success, logMetadataHash],
    {
      account: operatorAccount.address,
    },
  );

  const hash = await worldContract.write.completeWorkflowJob(
    [workflowId, cost, success, logMetadataHash],
    {
      chain: arbitrumSepolia,
      account: operatorAccount,
    },
  );

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
};

export const executeWorkflow = async (workflowId: Hex) => {
  const workflow = await getWorkflow(workflowId);
  if (workflow.workflowState !== WorkflowState.InProgress) {
    throw new Error(`Workflow is not in progress: ${workflowId}`);
  }
  const walletClient = new ServerWalletClient(
    workflow.workflowCreator,
    arbitrumSepolia.id,
  );

  const result: WorkflowExecutionResult = {
    success: false,
    results: [],
  };

  // execute each shaman in order
  let context: ShamanContext = {
    shamanCreator: zeroAddress,
    workflowCreator: workflow.workflowCreator,
    fetch,
    publicClient,
    walletClient,
    encodeFunctionData,
    parseEther,
    parseUnits,
    formatEther,
  };
  for (const shaman of workflow.workflowShamans) {
    // add shaman creator to context
    context = {
      ...context,
      shamanCreator: shaman.shamanCreator,
    };
    const codeResult = await executeShaman(shaman, context);
    logger.info(
      `Shaman ${shaman.shamanId} executed, success: ${codeResult.success}`,
    );

    result.results.push(codeResult);
    result.success = codeResult.success;
    if (!codeResult.success) {
      break;
    }

    // chain next result
    context = {
      ...context,
      previousResults: codeResult.result,
    };
  }

  logger.info(`Uploading operation log to IPFS: ${JSON.stringify(result)}`);
  const { cid: logMetadataHash } = await upload(result);
  logger.info(`Operation log uploaded to IPFS: ${logMetadataHash}`);

  // Complete workflow
  logger.info(`Completing workflow: ${JSON.stringify(result)}`);
  const logHash = await completeWorkflowJob(
    workflowId,
    1n, // TODO: fetch cost from contract
    logMetadataHash,
    result.success,
  );
  logger.info(`Workflow completed: ${logHash}`);

  return result;
};

export const executeShaman = (
  shaman: ShamanEntity,
  context: ShamanContext,
) => executeCode(shaman.shamanMetadata.code, context);
